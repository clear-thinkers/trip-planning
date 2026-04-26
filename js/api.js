import { API_BASE_URL } from "./aws-config.js";
import { signedFetch } from "./aws-auth.js";

async function call(path, method, body) {
  const url = `${API_BASE_URL}${path}`;
  const resp = await signedFetch(url, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const payload = await resp.json().catch(() => ({}));
    throw Object.assign(new Error(payload.message || `HTTP ${resp.status}`), { status: resp.status });
  }
  return resp.json();
}

export const createTrip = (data) => call("/trips", "POST", { data });
export const getTrip = (id) => call(`/trips/${id}`, "GET");
export const updateTrip = (id, data) => call(`/trips/${id}`, "PUT", { data });
export const updatePermission = (id, permission) => call(`/trips/${id}/permission`, "PATCH", { permission });
