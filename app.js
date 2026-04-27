import { bindEvents, cacheElements, els, populateSelects } from "./js/init.js";
import { getActiveTrip, normalizeTrip, saveStore, setRenderCallback, state } from "./js/state.js";
import { getUniqueTripTitle, renderAlerts, renderCalendar, renderControls, renderCosts, renderDayView, renderList, renderPlanningTodos, renderReadOnlyBanner, renderScreens, renderSidePanel, renderTabs, renderTripSettings, renderTripsList } from "./js/render-views.js";
import { renderPacking } from "./js/render-packing.js";
import { buildShareUrl, getCloudIdFromUrl, loadTripFromUrl, scheduleCloudSave } from "./js/share.js";
import { startSync, stopSync } from "./js/cloud-sync.js";
import { createId } from "./js/format.js";
import { initAuth } from "./js/aws-auth.js";

const SIDEBAR_VIEWS = new Set(["calendar", "list", "day"]);

export function render() {
  state.trip = getActiveTrip();
  if (!state.selectedDate && state.trip) state.selectedDate = state.trip.startDate;
  renderScreens();
  renderTripsList();
  if (state.trip) {
    renderTripSettings();
    renderTabs();
    renderAlerts();
    renderReadOnlyBanner();
    const viewRenderers = {
      calendar: renderCalendar,
      list: renderList,
      day: renderDayView,
      planning: renderPlanningTodos,
      packing: renderPacking,
      costs: renderCosts,
      controls: renderControls,
    };
    viewRenderers[state.view]?.();
    const showSidebar = SIDEBAR_VIEWS.has(state.view);
    els.contentGrid?.classList.toggle("sidebar-hidden", !showSidebar);
    if (els.sidePanel) {
      els.sidePanel.hidden = !showSidebar;
      if (showSidebar) {
        renderSidePanel();
      } else {
        els.sidePanel.innerHTML = "";
      }
    }
  }
  saveStore();
  scheduleCloudSave(state.trip, state.currentIdentityId);
  if (state.trip?.cloudId) {
    startSync(state.trip.cloudId);
  } else {
    stopSync();
  }
}

setRenderCallback(render);

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("bootWarning")?.setAttribute("hidden", "");
  cacheElements();
  populateSelects();
  bindEvents();

  try {
    state.currentIdentityId = await initAuth();
  } catch (err) {
    console.error("[trip-planner] AWS auth failed:", err);
  }

  const cloudId = getCloudIdFromUrl();
  if (cloudId) {
    try {
      const result = await loadTripFromUrl();
      const tripData = {
        ...result.data,
        cloudId: result.id,
        ownerId: result.ownerId,
        permission: result.permission,
      };
      const existing = state.store.trips.find((t) => t.cloudId === cloudId);
      if (existing) {
        const refreshed = normalizeTrip(tripData);
        refreshed.id = existing.id;
        Object.assign(existing, refreshed);
        state.store.activeTripId = existing.id;
      } else {
        const trip = normalizeTrip(tripData);
        trip.title = getUniqueTripTitle(trip.title);
        state.store.trips.push(trip);
        state.store.activeTripId = trip.id;
      }
      state.screen = "workspace";
    } catch (err) {
      const messages = {
        403: "This trip is private — only the owner can access it.",
        404: "Trip not found — this link may have expired.",
      };
      showCloudError(messages[err.status] ?? "Failed to load shared trip. Check your connection.");
      history.replaceState(null, "", window.location.pathname);
    }
  }

  state.trip = getActiveTrip();
  state.selectedDate = state.trip?.startDate || null;
  render();
});

function showCloudError(message) {
  const banner = document.getElementById("cloudErrorBanner");
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { scope: "./" })
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated") {
            const banner = document.getElementById("updateBanner");
            if (banner) banner.style.display = "block";
          }
        });
      });
    })
    .catch((err) => {
      console.error("[SW] Registration failed:", err);
    });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED") {
      const banner = document.getElementById("updateBanner");
      if (banner) banner.style.display = "block";
    }
  });
}
