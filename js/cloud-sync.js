import { getTrip } from "./api.js";
import { normalizeTrip, requestRender, saveStore, state } from "./state.js";
import { hasPendingSave } from "./share.js";

const POLL_INTERVAL = 30_000;

let _pollTimer = null;
let _tickTimer = null;
let _trackedCloudId = null;
let _lastSyncedAt = null;
let _lastCloudUpdatedAt = null;
let _syncing = false;
let _feedbackTimer = null;

export function getLastSyncedAt() {
  return _lastSyncedAt;
}

export function isSyncing() {
  return _syncing;
}

export function startSync(cloudId) {
  if (_trackedCloudId === cloudId) return;
  stopSync();
  if (!cloudId) return;
  _trackedCloudId = cloudId;
  _schedulePoll();
  _startTickTimer();
  document.addEventListener("visibilitychange", _onVisibilityChange);
}

export function stopSync() {
  clearTimeout(_pollTimer);
  clearInterval(_tickTimer);
  clearTimeout(_feedbackTimer);
  document.removeEventListener("visibilitychange", _onVisibilityChange);
  _pollTimer = null;
  _tickTimer = null;
  _trackedCloudId = null;
  _lastSyncedAt = null;
  _lastCloudUpdatedAt = null;
  _syncing = false;
  _feedbackTimer = null;
  updateLastSyncedDisplay();
}

export async function syncNow() {
  if (!_trackedCloudId) return;
  console.log("manual sync triggered");
  await _doPoll(true);
  _schedulePoll();
}

export function updateLastSyncedDisplay() {
  const el = document.getElementById("lastSyncedText");
  if (el) {
    if (!_lastSyncedAt) {
      el.hidden = true;
    } else {
      const seconds = Math.floor((Date.now() - _lastSyncedAt) / 1000);
      el.textContent = seconds < 10 ? "Just synced" : `Last synced ${seconds}s ago`;
      el.hidden = false;
    }
  }
  // Update near-button status only when not showing a success/error flash
  if (!_feedbackTimer) {
    if (!_lastSyncedAt) {
      _setRefreshStatus("", "");
    } else {
      const seconds = Math.floor((Date.now() - _lastSyncedAt) / 1000);
      _setRefreshStatus(seconds < 10 ? "Just synced" : `Last synced ${seconds}s ago`, "");
    }
  }
}

function _schedulePoll() {
  clearTimeout(_pollTimer);
  _pollTimer = setTimeout(async () => {
    await _doPoll();
    if (_trackedCloudId) _schedulePoll();
  }, POLL_INTERVAL);
}

function _startTickTimer() {
  if (_tickTimer) return;
  _tickTimer = setInterval(updateLastSyncedDisplay, 10_000);
}

function _onVisibilityChange() {
  if (document.visibilityState === "visible") {
    _doPoll();
    _schedulePoll();
  } else {
    clearTimeout(_pollTimer);
    _pollTimer = null;
  }
}

async function _doPoll(manual = false) {
  const cloudId = _trackedCloudId;
  if (!cloudId || _syncing) return;
  if (hasPendingSave()) return;
  _syncing = true;
  _setRefreshButtonBusy(true);
  let succeeded = false;
  try {
    const result = await getTrip(cloudId);
    if (!_trackedCloudId) return;
    if (!_lastCloudUpdatedAt || result.updatedAt > _lastCloudUpdatedAt) {
      const trip = state.store.trips.find((t) => t.cloudId === cloudId);
      if (trip) {
        const refreshed = normalizeTrip({ ...result.data, cloudId: result.id, ownerId: result.ownerId, permission: result.permission });
        refreshed.id = trip.id;
        Object.assign(trip, refreshed);
        saveStore();
        requestRender();
      }
      _lastCloudUpdatedAt = result.updatedAt;
    }
    _lastSyncedAt = Date.now();
    updateLastSyncedDisplay();
    succeeded = true;
  } catch (err) {
    console.error("[trip-planner] Cloud poll failed:", err);
  } finally {
    _syncing = false;
    _setRefreshButtonBusy(false);
    if (manual) {
      if (succeeded) _flashRefreshSuccess();
      else _flashRefreshError();
    }
  }
}

function _flashRefreshSuccess() {
  clearTimeout(_feedbackTimer);
  _setRefreshStatus("✓ Updated", "success");
  _feedbackTimer = setTimeout(() => {
    _feedbackTimer = null;
    updateLastSyncedDisplay();
  }, 2000);
}

function _flashRefreshError() {
  clearTimeout(_feedbackTimer);
  _setRefreshStatus("Sync failed", "error");
  _feedbackTimer = setTimeout(() => {
    _feedbackTimer = null;
    updateLastSyncedDisplay();
  }, 3000);
}

function _setRefreshStatus(text, className) {
  const el = document.getElementById("refreshCloudStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "refresh-cloud-status" + (className ? " " + className : "");
  el.hidden = !text;
}

function _setRefreshButtonBusy(busy) {
  const btn = document.getElementById("refreshCloudButton");
  if (!btn) return;
  btn.disabled = busy;
  btn.setAttribute("aria-busy", String(busy));
  const icon = document.getElementById("refreshCloudIcon");
  if (icon) icon.classList.toggle("spinning", busy);
}
