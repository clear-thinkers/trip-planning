"use strict";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const VALID = new Set(["private", "read_only", "editor"]);
const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
};

exports.handler = async (event) => {
  try {
    console.log('event:', JSON.stringify(event));
    const identityId = event.requestContext?.identity?.cognitoIdentityId;
    if (!identityId) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    const id = event.pathParameters?.id;
    if (!id) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: "Missing trip id" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: "Invalid JSON" }) };
    }

    if (!VALID.has(body.permission)) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: "permission must be private, read_only, or editor" }),
      };
    }

    const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));

    if (!existing.Item) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: "Trip not found" }) };
    }

    if (existing.Item.ownerId !== identityId) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ message: "Only the owner can change permissions" }) };
    }

    const now = new Date().toISOString();
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET permission = :perm, updatedAt = :now",
      ExpressionAttributeValues: { ":perm": body.permission, ":now": now },
    }));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ id, permission: body.permission, updatedAt: now }),
    };
  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
  }
};
