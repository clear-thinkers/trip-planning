"use strict";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;
const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
};

exports.handler = async (event) => {
  console.log('event:', JSON.stringify(event));
  try {
    const identityId = event.requestContext?.identity?.cognitoIdentityId;
    if (!identityId) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: "Unauthorized" }) };
    }

    const id = event.pathParameters?.id;
    if (!id) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: "Missing trip id" }) };
    }

    const result = await ddb.send(new GetCommand({ TableName: TABLE, Key: { id } }));

    if (!result.Item) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: "Trip not found" }) };
    }

    const item = result.Item;
    const isOwner = item.ownerId === identityId;
    const isShared = item.permission === "read_only" || item.permission === "editor";

    if (!isOwner && !isShared) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ message: "This trip is private" }) };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        id: item.id,
        data: JSON.parse(item.data),
        ownerId: item.ownerId,
        permission: item.permission,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }),
    };
  } catch (err) {
    console.error("Unhandled error in get-trip:", err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: err.message }) };
  }
};
