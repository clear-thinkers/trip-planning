import { bindEvents, cacheElements, els, populateSelects } from "./js/init.js";
import { getActiveTrip, saveStore, setRenderCallback, state } from "./js/state.js";
import { renderAlerts, renderCalendar, renderControls, renderCosts, renderDayView, renderList, renderPlanningTodos, renderScreens, renderSidePanel, renderTabs, renderTripSettings, renderTripsList } from "./js/render-views.js";
import { renderPacking } from "./js/render-packing.js";

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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("bootWarning")?.setAttribute("hidden", "");
  cacheElements();
  populateSelects();
  bindEvents();
  state.trip = getActiveTrip();
  state.selectedDate = state.trip?.startDate || null;
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { scope: "./" })
    .then((reg) => {
      console.log("[SW] Registered, scope:", reg.scope);
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
