import { getTrip } from "./api.js";
import { normalizeTrip, requestRender, saveStore, state } from "./state.js";

let _syncing = false;
let _feedbackTimer = null;

export function isSyncing() {
  return _syncing;
}

export function stopSync() {
  _syncing = false;
  clearTimeout(_feedbackTimer);
  _feedbackTimer = null;
  _setActionStatus("", "");
}

export async function syncNow(cloudId) {
  if (!cloudId || _syncing) return;
  _syncing = true;
  const btn = document.getElementById("importCloudButton");
  if (btn) { btn.disabled = true; btn.textContent = "Importing…"; }
  let succeeded = false;
  try {
    const result = await getTrip(cloudId);
    const trip = state.store.trips.find((t) => t.cloudId === cloudId);
    if (trip) {
      const refreshed = normalizeTrip({ ...result.data, cloudId: result.id, ownerId: result.ownerId, permission: result.permission });
      refreshed.id = trip.id;
      Object.assign(trip, refreshed);
      saveStore();
      requestRender();
    }
    succeeded = true;
  } catch (err) {
    console.error("[trip-planner] Import from cloud failed:", err);
  } finally {
    _syncing = false;
    if (btn) { btn.disabled = false; btn.textContent = "Import from Cloud"; }
    if (succeeded) _flashSuccess("✓ Imported from cloud");
    else _flashError("Import failed");
  }
}

function _flashSuccess(text) {
  clearTimeout(_feedbackTimer);
  _setActionStatus(text, "success");
  _feedbackTimer = setTimeout(() => {
    _feedbackTimer = null;
    _setActionStatus("", "");
  }, 2000);
}

function _flashError(text) {
  clearTimeout(_feedbackTimer);
  _setActionStatus(text, "error");
  _feedbackTimer = setTimeout(() => {
    _feedbackTimer = null;
    _setActionStatus("", "");
  }, 3000);
}

function _setActionStatus(text, className) {
  const el = document.getElementById("cloudActionStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "cloud-action-status" + (className ? " " + className : "");
  el.hidden = !text;
}
