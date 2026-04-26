// Requires window.AWS (AWS SDK v2) — loaded via <script> tag in index.html.
import { AWS_CONFIGURED, AWS_REGION, IDENTITY_POOL_ID } from "./aws-config.js";

const IDENTITY_KEY = "trip-planner-identity-id";

export async function initAuth() {
  if (!AWS_CONFIGURED) {
    console.warn("[trip-planner] AWS not configured. Update js/aws-config.js after deploying the backend.");
    return null;
  }
  AWS.config.region = AWS_REGION;
  const cachedId = localStorage.getItem(IDENTITY_KEY);
  AWS.config.credentials = new AWS.CognitoIdentityCredentials(
    { IdentityPoolId: IDENTITY_POOL_ID, ...(cachedId && { IdentityId: cachedId }) },
    { region: AWS_REGION },
  );
  await AWS.config.credentials.getPromise();
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
    await AWS.config.credentials.getPromise();
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
