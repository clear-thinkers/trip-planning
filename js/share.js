import { createTrip, getTrip, updateTrip, updatePermission } from "./api.js";
import { AWS_CONFIGURED } from "./aws-config.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildShareUrl(cloudId) {
  return `${window.location.href.split("#")[0]}#trip=${cloudId}`;
}

export function getCloudIdFromUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith("#trip=")) return null;
  const param = hash.slice(6);
  return UUID_RE.test(param) ? param : null;
}

// Returns the full API response: { id, data, ownerId, permission, createdAt, updatedAt }
export async function loadTripFromUrl() {
  const cloudId = getCloudIdFromUrl();
  if (!cloudId) return null;
  return getTrip(cloudId);
}

// Creates or updates the trip in the cloud.
// Returns: { id, ownerId, permission, createdAt?, updatedAt }
export async function saveToCloud(trip) {
  const { cloudId, ownerId, permission, ...data } = trip;
  if (cloudId) {
    return updateTrip(cloudId, data);
  }
  return createTrip(data);
}

export async function setTripPermission(cloudId, permission) {
  return updatePermission(cloudId, permission);
}

let _saveTimer = null;

export function hasPendingSave() {
  return _saveTimer !== null;
}

// Debounced auto-save — called from render() after every state mutation.
export function cancelPendingSave() {
  clearTimeout(_saveTimer);
  _saveTimer = null;
}

export function scheduleCloudSave(trip, currentIdentityId) {
  if (!AWS_CONFIGURED || !trip?.cloudId) return;
  const isOwner = trip.ownerId === currentIdentityId;
  if (!isOwner && trip.permission !== "editor") return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    _saveTimer = null;
    try {
      const { cloudId, ownerId, permission, ...data } = trip;
      await updateTrip(cloudId, data);
    } catch (err) {
      console.error("[trip-planner] Cloud auto-save failed:", err);
    }
  }, 1500);
}
