import { createTrip, getTrip, updateTrip, updatePermission } from "./api.js";

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

let _saving = false;
let _saveStatusTimer = null;

export async function manualSave(trip) {
  if (!trip?.cloudId || _saving) return;
  _saving = true;
  const btn = document.getElementById("saveCloudButton");
  const statusEl = document.getElementById("cloudActionStatus");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }
  let succeeded = false;
  try {
    await saveToCloud(trip);
    succeeded = true;
  } catch (err) {
    console.error("[trip-planner] Manual cloud save failed:", err);
  } finally {
    _saving = false;
    if (btn) { btn.disabled = false; btn.textContent = "Save to Cloud"; }
    if (statusEl) {
      clearTimeout(_saveStatusTimer);
      statusEl.textContent = succeeded ? "✓ Saved to cloud" : "Save failed";
      statusEl.className = "cloud-action-status" + (succeeded ? " success" : " error");
      statusEl.hidden = false;
      _saveStatusTimer = setTimeout(() => {
        statusEl.hidden = true;
        _saveStatusTimer = null;
      }, succeeded ? 2000 : 3000);
    }
  }
}
