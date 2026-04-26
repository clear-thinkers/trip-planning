"use strict";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
};

exports.handler = async (event) => {
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

  if (!body.data || typeof body.data !== "object") {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: "Missing or invalid data field" }) };
  }

  const existing = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  if (!existing.Item) {
    return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: "Trip not found" }) };
  }

  const item = existing.Item;
  const isOwner = item.ownerId === identityId;
  const canEdit = isOwner || item.permission === "editor";

  if (!canEdit) {
    return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ message: "Forbidden" }) };
  }

  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: "SET #data = :data, updatedAt = :now",
    ExpressionAttributeNames: { "#data": "data" },
    ExpressionAttributeValues: { ":data": JSON.stringify(body.data), ":now": now },
  }));

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ id, updatedAt: now }),
  };
};
