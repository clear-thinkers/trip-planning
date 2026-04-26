"use strict";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
};

exports.handler = async (event) => {
  try {
    const identityId = event.requestContext?.identity?.cognitoIdentityId;
    if (!identityId) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: "Invalid JSON" }) };
    }

    if (!body.data || typeof body.data !== "object") {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: "Missing or invalid data field" }) };
    }

    const now = new Date().toISOString();
    const id = randomUUID();

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: {
        id,
        data: JSON.stringify(body.data),
        ownerId: identityId,
        permission: "private",
        createdAt: now,
        updatedAt: now,
      },
    }));

    return {
      statusCode: 201,
      headers: HEADERS,
      body: JSON.stringify({ id, ownerId: identityId, permission: "private", createdAt: now, updatedAt: now }),
    };
  } catch (err) {
    console.error("Unhandled error in post-trip:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: err.message }) };
  }
};
