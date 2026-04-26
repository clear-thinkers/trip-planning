// Fill in these values after running: bash backend/deploy.sh
// The deploy script prints a table with all three values.
export const AWS_REGION = "us-east-1";
export const IDENTITY_POOL_ID = "us-east-1:22da3727-43cb-4213-bcea-eeb85de6ad40";
export const API_BASE_URL = "https://i00qf4w7tb.execute-api.us-east-1.amazonaws.com/prod";

// Automatically false when placeholders are still present — disables cloud features gracefully.
export const AWS_CONFIGURED =
  !IDENTITY_POOL_ID.includes("REPLACE") && !API_BASE_URL.includes("REPLACE");
