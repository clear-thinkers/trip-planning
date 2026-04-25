import { bindEvents, cacheElements, els, populateSelects } from "./js/init.js";
import { getActiveTrip, normalizeTrip, saveStore, setRenderCallback, state } from "./js/state.js";
import { getUniqueTripTitle, renderAlerts, renderCalendar, renderControls, renderCosts, renderDayView, renderList, renderPlanningTodos, renderScreens, renderSidePanel, renderTabs, renderTripSettings, renderTripsList } from "./js/render-views.js";
import { renderPacking } from "./js/render-packing.js";
import { loadTripFromUrl } from "./js/share.js";
import { createId } from "./js/format.js";

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
}

setRenderCallback(render);

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("bootWarning")?.setAttribute("hidden", "");
  cacheElements();
  populateSelects();
  bindEvents();

  const sharedTrip = await loadTripFromUrl();
  if (sharedTrip) {
    const trip = normalizeTrip(sharedTrip);
    trip.id = createId();
    trip.title = getUniqueTripTitle(trip.title);
    state.store.trips.push(trip);
    state.store.activeTripId = trip.id;
    state.screen = "workspace";
    history.replaceState(null, "", window.location.pathname);
  }

  state.trip = getActiveTrip();
  state.selectedDate = state.trip?.startDate || null;
  render();
});

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
