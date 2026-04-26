// Requires window.AWS (AWS SDK v2) — loaded via <script> tag in index.html.
import { AWS_CONFIGURED, AWS_REGION, IDENTITY_POOL_ID } from "./aws-config.js";

const IDENTITY_KEY = "trip-planner-identity-id";

export async function initAuth() {
  if (!AWS_CONFIGURED) {
    console.warn("[trip-planner] AWS not configured. Update js/aws-config.js after deploying the backend.");
    return null;
  }
  if (typeof AWS === "undefined") {
    console.error("[trip-planner] AWS SDK not loaded — check the <script> tag in index.html.");
    return null;
  }
  AWS.config.region = AWS_REGION;
  const cachedId = localStorage.getItem(IDENTITY_KEY);
  console.log("[trip-planner] initAuth starting. poolId=", IDENTITY_POOL_ID, "cachedId=", cachedId);
  AWS.config.credentials = new AWS.CognitoIdentityCredentials(
    { IdentityPoolId: IDENTITY_POOL_ID, ...(cachedId && { IdentityId: cachedId }) },
    { region: AWS_REGION },
  );
  try {
    await AWS.config.credentials.getPromise();
    console.log("[trip-planner] initAuth: credentials resolved. accessKeyId=", AWS.config.credentials.accessKeyId, "identityId=", AWS.config.credentials.identityId);
  } catch (err) {
    console.error("[trip-planner] initAuth: getPromise failed:", err);
    if (cachedId) {
      // Cached identity may be stale — retry without it.
      localStorage.removeItem(IDENTITY_KEY);
      console.log("[trip-planner] initAuth: retrying without cached identity...");
      AWS.config.credentials = new AWS.CognitoIdentityCredentials(
        { IdentityPoolId: IDENTITY_POOL_ID },
        { region: AWS_REGION },
      );
      try {
        await AWS.config.credentials.getPromise();
        console.log("[trip-planner] initAuth: retry succeeded. accessKeyId=", AWS.config.credentials.accessKeyId);
      } catch (err2) {
        console.error("[trip-planner] initAuth: retry also failed:", err2);
        throw err2;
      }
    } else {
      throw err;
    }
  }
  const identityId = AWS.config.credentials.identityId;
  localStorage.setItem(IDENTITY_KEY, identityId);
  return identityId;
}

export function getIdentityId() {
  return AWS.config?.credentials?.identityId ?? localStorage.getItem(IDENTITY_KEY) ?? null;
}

export async function signedFetch(url, options = {}) {
  if (!AWS.config?.credentials) throw new Error("AWS auth not initialized");
  if (!AWS.config.credentials.accessKeyId || AWS.config.credentials.needsRefresh()) {
    console.log("[trip-planner] signedFetch: credentials missing or stale, refreshing...");
    try {
      await AWS.config.credentials.getPromise();
      console.log("[trip-planner] signedFetch: refresh done. accessKeyId=", AWS.config.credentials.accessKeyId);
    } catch (err) {
      console.error("[trip-planner] signedFetch: credential refresh failed:", err);
      throw err;
    }
  }
  const endpoint = new AWS.Endpoint(url);
  const req = new AWS.HttpRequest(endpoint, AWS_REGION);
  req.method = options.method || "GET";
  if (options.body) req.body = options.body;
  req.headers["Content-Type"] = "application/json";
  req.headers["host"] = endpoint.host;

  const signer = new AWS.Signers.V4(req, "execute-api");
  signer.addAuthorization(AWS.config.credentials, new Date());

  // Strip headers the browser sets automatically (host, content-length).
  const fetchHeaders = Object.fromEntries(
    Object.entries(req.headers).filter(([k]) => !["host", "content-length"].includes(k.toLowerCase())),
  );

  return fetch(url, { method: req.method, headers: fetchHeaders, body: req.body || undefined });
}
