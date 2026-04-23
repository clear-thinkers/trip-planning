import { CURRENCIES, DEFAULT_TIMEZONE, ITEM_TYPES, PACK_STATUSES, STATUSES } from "./constants.js";
import { filterAllows, getActiveTrip, normalizeCostSettings, normalizeCurrency, normalizeCostValue, normalizeDueDate, normalizeHexColor, normalizeItem, normalizeItemTypeColors, normalizePackCategories, normalizeStore, normalizeSubtodo, normalizeTodo, normalizeTrip, normalizeFilterValues, normalizeTimezone, requestRender, saveStore, state } from "./state.js";
import { compareItems, convertCost, eachTripDate, formatCostTotals, getCalendarDates, getCostSettings, getItemsForDate, getPackingCostEntries, getPrimaryCity, getSubtodos, getTbdItems, getTodoCostEntries, getTodoDueBucket, getTravelCostEntries, getTripCities, getTripTodos, shouldShowTimezoneForItems } from "./data.js";
import { debounce, buildDateTimeValue, createId, escapeHtml, formatCostAmount, formatDateLong, formatDateShort, formatItemTime, getDatePart, getTimePart, parseLocalDate, shiftDateTimeToDate, shiftEndDateTimeToDate, slugify, splitList, toIsoDate } from "./format.js";
import { getWarnings, getWarningsForTrip } from "./warnings.js";
import { getDefaultItemTypeColor, getItemMeta, getItemTypeColor, renderCurrencyOptions, renderItemTypeStyle, renderStatusIcon, renderTimelineRow } from "./render-shared.js";
import { els, getSelectedPeople, populatePeopleSelect, setSelectedPeople, updateDateTimeTbdControls, updateItemFormForType } from "./init.js";
import { bindPackingActions, getPackingFilterTagOptions, renderPackingControls } from "./render-packing.js";

const render = requestRender;
const MOBILE_BREAKPOINT = 768;

export function isMobileViewport() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}
const STATUS_LEGEND_DETAILS = {
  Idea: "想法，表示这是初步构想，还没有完全定下来。",
  Planned: "已规划，表示已经排进计划，时间或安排大致确定。",
  Booked: "已预订，表示机票、酒店或活动已经下单预留。",
  Confirmed: "已确认，表示已经再次确认，执行时所需信息基本齐全。",
  Done: "已完成，表示这项行程已经顺利结束。",
  Skipped: "已跳过，表示原本考虑过，但这次不会执行。",
};

export function renderScreens() {
  const inWorkspace = state.screen === "workspace";
  els.tripsPage.hidden = inWorkspace;
  els.tripSettings.hidden = !inWorkspace;
  els.workspace.hidden = !inWorkspace;
  els.allTripsButton.hidden = !inWorkspace;
  els.printCalendarButton.hidden = !inWorkspace;
  els.exportButton.hidden = !inWorkspace;
  els.importButton.hidden = !inWorkspace;
  els.addItemButton.hidden = !inWorkspace;
}

export function renderTripsList() {
  els.tripsList.innerHTML = state.store.trips
    .map((trip) => {
      const warnings = getWarningsForTrip(trip);
      const cities = getTripCities(trip);
      const isCurrent = trip.id === state.store.activeTripId;
      return `
        <article class="trip-card ${isCurrent ? "current" : ""}">
          <div>
            <p class="eyebrow">${isCurrent ? "Current trip" : "Saved trip"}</p>
            <h3>${escapeHtml(trip.title)}</h3>
            <p class="muted">${escapeHtml(formatDateShort(trip.startDate))} - ${escapeHtml(formatDateShort(trip.endDate))}</p>
            <p class="muted">${escapeHtml(cities || "No cities yet")}</p>
          </div>
          <div class="trip-card-stats">
            <span class="badge">${trip.items.length} item${trip.items.length === 1 ? "" : "s"}</span>
            ${warnings.length ? `<span class="badge warning">${warnings.length} warning${warnings.length === 1 ? "" : "s"}</span>` : ""}
          </div>
          <div class="trip-card-actions">
            <button class="primary-button" data-trip-action="open" data-id="${trip.id}" type="button">Open</button>
            <button class="secondary-button" data-trip-action="reset" data-id="${trip.id}" type="button">Reset data</button>
            <button class="danger-button" data-trip-action="delete" data-id="${trip.id}" type="button">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");

  els.tripsList.querySelectorAll("[data-trip-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const action = button.dataset.tripAction;
      if (action === "open") openTrip(id);
      if (action === "reset") resetTrip(id);
      if (action === "delete") deleteTrip(id);
    });
  });
}

export function openTrip(id) {
  state.store.activeTripId = id;
  state.trip = getActiveTrip();
  state.selectedDate = state.trip.startDate;
  state.view = "calendar";
  state.packingSubView = "list";
  state.screen = "workspace";
  state.filters = { type: ["all"], status: ["all"], search: "" };
  state.todoFilters = { status: ["all"], dueDate: ["all"], search: "" };
  state.packingFilters = { status: ["all"], tags: ["all"], search: "" };
  state.costFilters = { operator: "all", amount: "", currency: "USD", search: "" };
  render();
}

export function createNewTrip() {
  const today = toIsoDate(new Date());
  const end = parseLocalDate(today);
  end.setDate(end.getDate() + 6);
  const trip = normalizeTrip({
    title: "New Trip",
    startDate: today,
    endDate: toIsoDate(end),
    homeTimezone: DEFAULT_TIMEZONE,
    items: [],
  });
  state.store.trips.push(trip);
  openTrip(trip.id);
}

export function resetTrip(id) {
  const trip = state.store.trips.find((entry) => entry.id === id);
  if (!trip) return;
  const confirmation = window.prompt(
    `Reset "${trip.title}"?\n\nThis will permanently clear all itinerary items, checklist todos, packing items, bag setup, and trip notes. The trip shell and dates will stay, but the removed data cannot be recovered.\n\nType RESET to continue.`,
  );
  if (confirmation !== "RESET") return;
  trip.items = [];
  trip.todos = [];
  trip.packItems = [];
  trip.bags = [];
  trip.packCategories = normalizePackCategories();
  trip.notes = "";
  trip.updatedAt = new Date().toISOString();
  if (state.store.activeTripId === id) {
    state.trip = trip;
    state.selectedDate = trip.startDate;
  }
  render();
}

export function deleteTrip(id) {
  const trip = state.store.trips.find((entry) => entry.id === id);
  if (!trip) return;
  const confirmation = window.prompt(
    `Delete "${trip.title}"?\n\nThis will permanently remove the entire trip from saved trips, including itinerary items, checklist todos, notes, and settings. This cannot be recovered.\n\nType DELETE to continue.`,
  );
  if (confirmation !== "DELETE") return;
  state.store.trips = state.store.trips.filter((entry) => entry.id !== id);
  if (!state.store.trips.length) {
    const newTrip = normalizeTrip({
      title: "New Trip",
      startDate: toIsoDate(new Date()),
      endDate: toIsoDate(new Date()),
      homeTimezone: DEFAULT_TIMEZONE,
      items: [],
    });
    state.store.trips.push(newTrip);
  }
  state.store.activeTripId = state.store.trips[0].id;
  state.trip = getActiveTrip();
  state.selectedDate = state.trip.startDate;
  state.screen = "trips";
  render();
}

export function renderTripSettings() {
  els.tripTitle.value = state.trip.title;
  els.tripStart.value = state.trip.startDate;
  els.tripEnd.value = state.trip.endDate;
  els.tripTimezone.value = normalizeTimezone(state.trip.homeTimezone);
  state.filters.type = normalizeFilterValues(state.filters.type);
  state.filters.status = normalizeFilterValues(state.filters.status);
  state.todoFilters.status = normalizeFilterValues(state.todoFilters.status);
  state.todoFilters.dueDate = normalizeFilterValues(state.todoFilters.dueDate);
  state.packingFilters.status = normalizeFilterValues(state.packingFilters.status);
  state.packingFilters.tags = normalizeFilterValues(state.packingFilters.tags);
  state.costFilters.operator = ["all", "<", "<=", ">=", ">"].includes(state.costFilters.operator) ? state.costFilters.operator : "all";
  state.costFilters.currency = CURRENCIES.includes(state.costFilters.currency) ? state.costFilters.currency : "USD";
  renderWorkspaceFilters();
}

export function renderWorkspaceFilters() {
  const isPlanningView = state.view === "planning";
  const isPackingView = state.view === "packing";
  const isCostsView = state.view === "costs";
  const typeField = els.typeFilter.closest(".filter-select-field");
  const statusField = els.statusFilter.closest(".filter-select-field");
  const typeLabel = document.querySelector("label[for='typeFilter']");
  const statusLabel = document.querySelector("label[for='statusFilter']");
  const searchLabel = document.querySelector("label[for='searchInput']");
  const typeHint = typeField?.querySelector(".field-hint");
  const statusHint = statusField?.querySelector(".field-hint");
  const typeToggle = typeField?.querySelector(".filter-toggle");
  const statusToggle = statusField?.querySelector(".filter-toggle");
  const amountLabel = els.costAmountFilterLabel;
  const amountInput = els.costAmountFilter;
  const configureSelectMode = (select, toggle, multiple, size) => {
    if (!select) return;
    select.multiple = multiple;
    select.size = size;
    if (!multiple) {
      select.closest(".filter-select-field")?.classList.remove("expanded");
      toggle?.setAttribute("aria-expanded", "false");
      if (toggle) toggle.textContent = "Expand";
    }
    if (toggle) toggle.hidden = !multiple;
  };
  if (amountLabel) amountLabel.hidden = !isCostsView;
  if (amountInput) amountInput.hidden = !isCostsView;
  if (isCostsView) {
    configureSelectMode(els.typeFilter, typeToggle, false, 1);
    configureSelectMode(els.statusFilter, statusToggle, false, 1);
    if (typeLabel) typeLabel.textContent = "Price rule";
    if (statusLabel) statusLabel.textContent = "Price currency";
    if (searchLabel) searchLabel.textContent = "Search costs";
    if (amountLabel) amountLabel.textContent = "Price amount";
    if (typeHint) typeHint.textContent = "Compare cost entries against a threshold.";
    if (statusHint) statusHint.textContent = "Choose the currency used for the price comparison.";
    els.searchInput.placeholder = "Title, details, source, currency";
    renderFilterOptions(els.typeFilter, [
      { value: "all", label: "Any price" },
      { value: "<", label: "< amount" },
      { value: "<=", label: "<= amount" },
      { value: ">=", label: ">= amount" },
      { value: ">", label: "> amount" },
    ]);
    renderFilterOptions(els.statusFilter, CURRENCIES.map((currency) => ({ value: currency, label: currency })));
    els.typeFilter.value = state.costFilters.operator;
    els.statusFilter.value = state.costFilters.currency;
    if (amountInput) amountInput.value = state.costFilters.amount;
    els.searchInput.value = state.costFilters.search;
    return;
  }
  configureSelectMode(els.typeFilter, typeToggle, true, 5);
  configureSelectMode(els.statusFilter, statusToggle, true, 5);
  if (isPackingView) {
    if (typeLabel) typeLabel.textContent = "Packing status";
    if (statusLabel) statusLabel.textContent = "Tags";
    if (searchLabel) searchLabel.textContent = "Search packing";
    if (typeHint) typeHint.textContent = "Filter for one or more packing statuses.";
    if (statusHint) statusHint.textContent = "Filter for one or more packing tags.";
    els.searchInput.placeholder = "Title, category, tags, bag, notes";
    renderFilterOptions(els.typeFilter, [
      { value: "all", label: "All statuses" },
      ...PACK_STATUSES.map((status) => ({ value: status, label: status })),
    ]);
    renderFilterOptions(els.statusFilter, [
      { value: "all", label: "All tags" },
      ...getPackingFilterTagOptions().map((tag) => ({ value: tag, label: tag })),
    ]);
    setSelectedFilterValues(els.typeFilter, state.packingFilters.status);
    setSelectedFilterValues(els.statusFilter, state.packingFilters.tags);
    els.searchInput.value = state.packingFilters.search;
    return;
  }
  if (isPlanningView) {
    if (typeLabel) typeLabel.textContent = "Todo status";
    if (statusLabel) statusLabel.textContent = "Due date";
    if (searchLabel) searchLabel.textContent = "Search todos";
    if (typeHint) typeHint.textContent = "Filter for open items, checked off items, or both.";
    if (statusHint) statusHint.textContent = "Filter by the current week ending Sunday.";
    els.searchInput.placeholder = "Todo text, due date, notes";
    renderFilterOptions(els.typeFilter, [
      { value: "all", label: "All items" },
      { value: "open", label: "Open items" },
      { value: "done", label: "Checked off" },
    ]);
    renderFilterOptions(els.statusFilter, [
      { value: "all", label: "All due dates" },
      { value: "past-due", label: "Past due" },
      { value: "due-this-week", label: "Due this week" },
      { value: "due-later", label: "Due later" },
    ]);
    setSelectedFilterValues(els.typeFilter, state.todoFilters.status);
    setSelectedFilterValues(els.statusFilter, state.todoFilters.dueDate);
    els.searchInput.value = state.todoFilters.search;
    return;
  }

  if (typeLabel) typeLabel.textContent = "Type";
  if (statusLabel) statusLabel.textContent = "Status";
  if (searchLabel) searchLabel.textContent = "Search";
  if (typeHint) typeHint.textContent = "Select one or more types.";
  if (statusHint) statusHint.textContent = "Select one or more statuses.";
  els.searchInput.placeholder = "Title, city, people, notes";
  renderFilterOptions(els.typeFilter, [
    { value: "all", label: "All types" },
    ...ITEM_TYPES.map((type) => ({ value: type, label: type })),
  ]);
  renderFilterOptions(els.statusFilter, [
    { value: "all", label: "All statuses" },
    ...STATUSES.map((status) => ({ value: status, label: status })),
  ]);
  setSelectedFilterValues(els.typeFilter, state.filters.type);
  setSelectedFilterValues(els.statusFilter, state.filters.status);
  els.searchInput.value = state.filters.search;
}

export function renderFilterOptions(select, options) {
  const selectedValues = new Set(Array.from(select.selectedOptions || []).map((option) => option.value));
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
  Array.from(select.options).forEach((option) => {
    option.selected = selectedValues.has(option.value);
  });
}

export function renderTabs() {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === state.view));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${state.view}View`));
}

export function renderAlerts() {
  els.alerts.hidden = true;
  els.alerts.innerHTML = "";
}

export function getWeekStartMonday(value) {
  const date = parseLocalDate(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toIsoDate(date);
}

export function groupDatesByMondayWeek(dates) {
  const weeks = [];
  const weekMap = new Map();
  dates.forEach((date) => {
    const weekStart = getWeekStartMonday(date);
    if (!weekMap.has(weekStart)) {
      const group = { weekStart, dates: [] };
      weekMap.set(weekStart, group);
      weeks.push(group);
    }
    weekMap.get(weekStart).dates.push(date);
  });
  return weeks;
}

export function renderInlineDayActions(date) {
  return `
    <div class="day-actions inline-day-actions">
      <button class="primary-button" data-action="add-on-day" data-date="${date}" type="button">Add</button>
      <button class="secondary-button" data-action="go-day" data-date="${date}" type="button">Review</button>
    </div>
  `;
}

export function renderMobileCalendarDay(date) {
  const items = getItemsForDate(date);
  const showTimezone = shouldShowTimezoneForItems(items);
  const city = getPrimaryCity(date);
  return `
    <article class="mobile-day-group ${date === state.selectedDate ? "selected-section" : ""}">
      <button class="mobile-day-button" data-action="select-day" data-date="${date}" type="button">
        <span class="mobile-day-heading">
          <span class="mobile-day-label">${escapeHtml(formatDateLong(date))}</span>
          <span class="mobile-day-subtitle">${escapeHtml(city || "No primary city yet")}</span>
        </span>
        <span class="badge">${items.length} item${items.length === 1 ? "" : "s"}</span>
      </button>
      ${date === state.selectedDate ? renderInlineDayActions(date) : ""}
      ${
        items.length
          ? `
            <div class="item-stack mobile-day-item-stack">
              ${items
                .map(
                  (item) => `
                    <button class="item-pill" ${renderItemTypeStyle(item.type)} data-action="edit" data-id="${item.id}" data-type="${escapeHtml(item.type)}" type="button">
                      ${renderStatusIcon(item.status)}
                      <span class="item-time">${escapeHtml(formatItemTime(item, { showTimezone }))}</span>
                      <span class="item-title">${escapeHtml(item.title)}</span>
                      <span class="item-meta">${escapeHtml(getItemMeta(item))}</span>
                    </button>
                  `,
                )
                .join("")}
            </div>
          `
          : `<div class="empty-state compact">No plans yet.</div>`
      }
    </article>
  `;
}

export function renderMobileCalendar() {
  const weeks = groupDatesByMondayWeek(eachTripDate());
  return `
    <div class="mobile-calendar-list">
      ${weeks
        .map(
          (week) => `
            <section class="section-block mobile-week-block">
              <div class="mobile-week-header">
                <p class="eyebrow">Calendar week</p>
                <h3>Week of ${escapeHtml(formatDateShort(week.weekStart))}</h3>
              </div>
              <div class="mobile-week-days">
                ${week.dates.map((date) => renderMobileCalendarDay(date)).join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
}

export function renderCalendarStatusLegend() {
  const statusLegend = STATUSES.map((status) => {
    const description = STATUS_LEGEND_DETAILS[status] || "";
    return `
      <div class="calendar-status-legend-item">
        ${renderStatusIcon(status)}
        <div class="calendar-status-legend-copy">
          <strong>${escapeHtml(status)}</strong>
          <span>${escapeHtml(description)}</span>
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="calendar-status-legend" aria-label="Status legend">
      <h3>çŠ¶æ€å›¾ä¾‹</h3>
      <div class="calendar-status-legend-list">${statusLegend}</div>
    </section>
  `;
}

export function renderCalendar() {
  if (isMobileViewport()) {
    els.calendarView.innerHTML = renderMobileCalendar() + renderCalendarStatusLegend();
    bindDynamicActions(els.calendarView);
    return;
  }

  const dates = getCalendarDates();
  const printWeekCount = Math.max(1, Math.ceil(dates.length / 7));
  const printWeekHeight = `${Math.min(1.45, 9.15 / printWeekCount).toFixed(2)}in`;
  const days = dates.map((date) => {
    if (!date.inRange) {
      return `<div class="day-cell empty" aria-hidden="true"></div>`;
    }
    const dayItems = getItemsForDate(date.iso);
    const showTimezone = shouldShowTimezoneForItems(dayItems);
    const items = dayItems.slice(0, 4);
    const city = getPrimaryCity(date.iso);
    const itemMarkup = items
      .map(
        (item) => `
          <button class="item-pill" ${renderItemTypeStyle(item.type)} data-action="edit" data-id="${item.id}" data-type="${escapeHtml(item.type)}" data-calendar-drag="true" draggable="true" type="button">
            ${renderStatusIcon(item.status)}
            <span class="item-time">${escapeHtml(formatItemTime(item, { showTimezone }))}</span>
            <span class="item-title">${escapeHtml(item.title)}</span>
            <span class="item-meta">${escapeHtml(getItemMeta(item))}</span>
          </button>
        `,
      )
      .join("");
    const hiddenCount = dayItems.length - items.length;
    return `
      <div class="day-cell ${date.iso === state.selectedDate ? "selected" : ""}" data-date="${date.iso}">
        <button class="day-button" data-action="select-day" data-date="${date.iso}" type="button">
          <span class="date-number">${date.dayNumber}</span>
          <span class="day-city">${escapeHtml(city)}</span>
        </button>
        <div class="item-stack">${itemMarkup}</div>
        ${hiddenCount > 0 ? `<p class="more-count">+${hiddenCount} more</p>` : ""}
      </div>
    `;
  });
  const statusLegend = STATUSES.map((status) => {
    const description = STATUS_LEGEND_DETAILS[status] || "";
    return `
      <div class="calendar-status-legend-item">
        ${renderStatusIcon(status)}
        <div class="calendar-status-legend-copy">
          <strong>${escapeHtml(status)}</strong>
          <span>${escapeHtml(description)}</span>
        </div>
      </div>
    `;
  }).join("");

  els.calendarView.innerHTML = `
    <div class="print-calendar-header">
      <p class="eyebrow">Calendar PDF</p>
      <h2>${escapeHtml(state.trip.title)}</h2>
      <p>${escapeHtml(formatDateShort(state.trip.startDate))} - ${escapeHtml(formatDateShort(state.trip.endDate))}</p>
    </div>
    <div class="calendar-board" style="--print-week-height: ${printWeekHeight};">
      <div class="weekday-row">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="weekday">${day}</div>`).join("")}
      </div>
      <div class="calendar-grid">${days.join("")}</div>
    </div>
    <section class="calendar-status-legend" aria-label="Status legend">
      <h3>状态图例</h3>
      <div class="calendar-status-legend-list">${statusLegend}</div>
    </section>
  `;
  bindDynamicActions(els.calendarView);
  bindCalendarDayCells();
  bindCalendarItemDragAndDrop();
}

export function renderList() {
  const mobile = isMobileViewport();
  const rows = eachTripDate()
    .map((date) => {
      const items = getItemsForDate(date);
      const showTimezone = shouldShowTimezoneForItems(items);
      const city = getPrimaryCity(date);
      return `
        <section class="section-block ${date === state.selectedDate ? "selected-section" : ""}">
          <div class="section-header">
            <button class="list-day-button" data-action="select-day" data-date="${date}" type="button">
              ${escapeHtml(formatDateLong(date))}
            </button>
            <span class="muted">${items.length} item${items.length === 1 ? "" : "s"}</span>
          </div>
          ${mobile && city ? `<p class="muted list-day-city">${escapeHtml(city)}</p>` : ""}
          ${mobile && date === state.selectedDate ? renderInlineDayActions(date) : ""}
          ${
            items.length
              ? `<div class="timeline">${items.map((item) => renderTimelineRow(item, { showTimezone })).join("")}</div>`
              : `<div class="empty-state">No plans yet.</div>`
          }
        </section>
      `;
    })
    .join("");
  const tbdItems = getTbdItems();
  const tbdRows = tbdItems.length
    ? `
      <section class="section-block">
        <div class="section-header">
          <h3>TBD / Unscheduled</h3>
          <span class="muted">${tbdItems.length} item${tbdItems.length === 1 ? "" : "s"}</span>
        </div>
        <div class="timeline">${tbdItems.map(renderTimelineRow).join("")}</div>
      </section>
    `
    : "";
  els.listView.innerHTML = rows + tbdRows;
  bindDynamicActions(els.listView);
}

export function renderDayView() {
  const date = state.selectedDate || state.trip.startDate;
  const items = getItemsForDate(date);
  const showTimezone = shouldShowTimezoneForItems(items);
  const warnings = getWarnings().filter((warning) => warning.date === date);
  els.dayView.innerHTML = `
    <section class="section-block">
      <div class="section-header">
        <div>
          <p class="eyebrow">Day detail</p>
          <h2>${escapeHtml(formatDateLong(date))}</h2>
        </div>
        <button class="secondary-button" data-action="add-on-day" data-date="${date}" type="button">Add to day</button>
      </div>
      ${
        warnings.length
          ? `<div class="alerts">${warnings.map((warning) => `<div class="alert"><strong>${escapeHtml(warning.type)}</strong><span>${escapeHtml(warning.message)}</span></div>`).join("")}</div>`
          : ""
      }
      ${
        items.length
          ? `<div class="timeline">${items.map((item) => renderTimelineRow(item, { showTimezone })).join("")}</div>`
          : `<div class="empty-state">No plans yet. Add an anchor or flexible idea for this day.</div>`
      }
    </section>
  `;
  bindDynamicActions(els.dayView);
}

export function renderCosts() {
  const travelCosts = getFilteredCostEntries(getTravelCostEntries());
  const todoCosts = getFilteredCostEntries(getTodoCostEntries());
  const packingCosts = getFilteredCostEntries(getPackingCostEntries());
  const allCosts = [...travelCosts, ...todoCosts, ...packingCosts];
  const costSettings = getCostSettings();
  els.costsView.innerHTML = `
    <section class="section-block costs-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Costs</p>
          <h2>Trip cost tracker</h2>
        </div>
      </div>
      <div class="cost-controls">
        <div class="field">
          <label for="costDisplayCurrency">Display currency</label>
          <select id="costDisplayCurrency">
            ${renderCurrencyOptions(costSettings.displayCurrency)}
          </select>
        </div>
        <div class="field">
          <label for="usdToRmbRate">Exchange rate</label>
          <input id="usdToRmbRate" type="number" min="0.0001" step="0.0001" value="${escapeHtml(costSettings.usdToRmbRate)}" />
          <p class="field-hint">1 USD = RMB</p>
        </div>
      </div>
      <div class="cost-summary-grid" style="grid-template-columns: repeat(4, minmax(0, 1fr));">
        ${renderCostSummaryCard("Total tracked", allCosts, costSettings, "total")}
        ${renderCostSummaryCard("Travel plans", travelCosts, costSettings, "travel")}
        ${renderCostSummaryCard("Checklist todos", todoCosts, costSettings, "todo")}
        ${renderCostSummaryCard("Packing items", packingCosts, costSettings, "packing")}
      </div>
      <div class="cost-breakdown-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
        ${renderCostBreakdown("Travel costs", travelCosts, "Costs entered on calendar and day detail itinerary items.", costSettings, "travel")}
        ${renderCostBreakdown("Checklist costs", todoCosts, "Costs entered on planning todos and sub todos.", costSettings, "todo")}
        ${renderCostBreakdown("Packing costs", packingCosts, "Costs entered on packing items across the packing planner.", costSettings, "packing")}
      </div>
    </section>
  `;
  bindCostControls();
}

export function getFilteredCostEntries(entries) {
  const costSettings = getCostSettings();
  const operator = state.costFilters.operator;
  const amount = Number(state.costFilters.amount);
  const hasPriceFilter = operator !== "all" && Number.isFinite(amount) && amount >= 0;
  return entries.filter((entry) => {
    const convertedAmount = convertCost(entry.cost, entry.currency, state.costFilters.currency, costSettings);
    const priceMatch =
      !hasPriceFilter
      || (operator === "<" && convertedAmount < amount)
      || (operator === "<=" && convertedAmount <= amount)
      || (operator === ">=" && convertedAmount >= amount)
      || (operator === ">" && convertedAmount > amount);
    const haystack = [
      entry.title,
      entry.meta,
      entry.source,
      entry.currency,
      state.costFilters.currency,
      entry.cost,
      convertedAmount,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchMatch = !state.costFilters.search || haystack.includes(state.costFilters.search);
    return priceMatch && searchMatch;
  });
}

export function renderCostSummaryCard(title, entries, costSettings, variant = "") {
  const totals = formatCostTotals(entries, costSettings);
  const inlineStyle =
    variant === "packing"
      ? ' style="background: #fff5f5; border-color: rgba(184, 74, 74, 0.22);"'
      : "";
  return `
    <article class="cost-summary-card ${variant ? `cost-summary-${variant}` : ""}"${inlineStyle}>
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(totals || "No costs yet")}</strong>
      <small>${entries.length} entr${entries.length === 1 ? "y" : "ies"}</small>
    </article>
  `;
}

export function renderCostBreakdown(title, entries, description, costSettings, variant = "") {
  const inlineStyle =
    variant === "packing"
      ? ' style="background: #fff8f8; border-color: rgba(184, 74, 74, 0.22);"'
      : "";
  return `
    <section class="cost-breakdown ${variant ? `cost-breakdown-${variant}` : ""}"${inlineStyle}>
      <div class="section-header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p class="muted">${escapeHtml(description)}</p>
        </div>
        <span class="badge">${escapeHtml(formatCostTotals(entries, costSettings) || "No costs")}</span>
      </div>
      ${
        entries.length
          ? `<div class="cost-entry-list">${entries.map((entry) => renderCostEntry(entry, costSettings)).join("")}</div>`
          : `<div class="empty-state compact">No tracked costs yet.</div>`
      }
    </section>
  `;
}

export function renderCostEntry(entry, costSettings) {
  const originalCost = formatCostAmount(entry.cost, entry.currency);
  const convertedCost = formatCostAmount(convertCost(entry.cost, entry.currency, costSettings.displayCurrency, costSettings), costSettings.displayCurrency);
  const meta = normalizeCurrency(entry.currency) === costSettings.displayCurrency ? entry.meta : `${entry.meta} - Original ${originalCost}`;
  return `
    <div class="cost-entry">
      <div>
        <strong>${escapeHtml(entry.title)}</strong>
        <span>${escapeHtml(meta)}</span>
      </div>
      <span class="cost-amount">${escapeHtml(convertedCost)}</span>
    </div>
  `;
}

export function bindCostControls() {
  const currencySelect = els.costsView.querySelector("#costDisplayCurrency");
  const rateInput = els.costsView.querySelector("#usdToRmbRate");
  currencySelect?.addEventListener("change", updateCostSettingsFromControls);
  rateInput?.addEventListener("change", updateCostSettingsFromControls);
}

export function updateCostSettingsFromControls() {
  const currencySelect = els.costsView.querySelector("#costDisplayCurrency");
  const rateInput = els.costsView.querySelector("#usdToRmbRate");
  state.trip.costSettings = normalizeCostSettings({
    displayCurrency: currencySelect?.value,
    usdToRmbRate: rateInput?.value,
  });
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function renderControls() {
  const rows = ITEM_TYPES.map((type) => {
    const color = getItemTypeColor(type);
    const defaultColor = getDefaultItemTypeColor(type);
    const itemCount = state.trip.items.filter((item) => item.type === type).length;
    return `
      <div class="type-color-row">
        <div class="type-color-label">
          <span class="type-color-swatch" style="background: ${escapeHtml(color)};"></span>
          <div>
            <strong>${escapeHtml(type)}</strong>
            <span>${itemCount} item${itemCount === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div class="type-color-controls">
          <input data-color-type="${escapeHtml(type)}" type="color" value="${escapeHtml(color)}" aria-label="${escapeHtml(`${type} color`)}" />
          <input class="color-code-input" data-color-code-type="${escapeHtml(type)}" type="text" value="${escapeHtml(color.toUpperCase())}" aria-label="${escapeHtml(`${type} hex color`)}" spellcheck="false" />
          <button class="secondary-button" data-reset-color="${escapeHtml(type)}" type="button" ${color === defaultColor ? "disabled" : ""}>Reset</button>
        </div>
      </div>
    `;
  }).join("");

  els.controlsView.innerHTML = `
    <section class="section-block controls-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Controls</p>
          <h2>Item type colors</h2>
        </div>
        <button class="secondary-button" id="resetAllColorsButton" type="button">Reset all colors</button>
      </div>
      <p class="muted">Pick the stripe color used for each item type on the calendar, day detail, and selected day panels.</p>
      <div class="type-color-grid">${rows}</div>
    </section>
    ${renderPackingControls()}
  `;

  els.controlsView.querySelectorAll("[data-color-type]").forEach((input) => {
    input.addEventListener("input", () => updateItemTypeColor(input.dataset.colorType, input.value, { renderControls: false }));
    input.addEventListener("change", () => updateItemTypeColor(input.dataset.colorType, input.value));
  });
  els.controlsView.querySelectorAll("[data-color-code-type]").forEach((input) => {
    input.addEventListener("input", () => updateItemTypeColorFromCode(input, { renderControls: false }));
    input.addEventListener("change", () => updateItemTypeColorFromCode(input));
  });
  els.controlsView.querySelectorAll("[data-reset-color]").forEach((button) => {
    button.addEventListener("click", () => updateItemTypeColor(button.dataset.resetColor, getDefaultItemTypeColor(button.dataset.resetColor)));
  });
  els.controlsView.querySelector("#resetAllColorsButton").addEventListener("click", resetItemTypeColors);
  bindPackingActions(els.controlsView);
}

export function updateItemTypeColorFromCode(input, options = {}) {
  const color = normalizeHexColor(input.value);
  input.setCustomValidity(color ? "" : "Use a hex color like #FD151B.");
  if (!color) {
    if (options.renderControls !== false) input.reportValidity();
    return;
  }
  updateItemTypeColor(input.dataset.colorCodeType, color, options);
}

export function updateItemTypeColor(type, value, options = {}) {
  if (!ITEM_TYPES.includes(type)) return;
  const color = normalizeHexColor(value) || getDefaultItemTypeColor(type);
  state.trip.itemTypeColors = normalizeItemTypeColors({
    ...state.trip.itemTypeColors,
    [type]: color,
  });
  state.trip.updatedAt = new Date().toISOString();
  applyItemTypeColorToRenderedItems(type, color);
  updateColorControlReadout(type, color);
  saveStore();
  if (options.renderControls !== false) render();
}

export function resetItemTypeColors() {
  state.trip.itemTypeColors = normalizeItemTypeColors();
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function applyItemTypeColorToRenderedItems(type, color) {
  document.querySelectorAll(".item-pill[data-type], .timeline-card[data-type]").forEach((element) => {
    if (element.dataset.type === type) element.style.setProperty("--item-type-color", color);
  });
}

export function updateColorControlReadout(type, color) {
  els.controlsView.querySelectorAll("[data-color-type]").forEach((input) => {
    if (input.dataset.colorType !== type) return;
    const row = input.closest(".type-color-row");
    input.value = color;
    row?.querySelector(".type-color-swatch")?.style.setProperty("background", color);
    const codeInput = row?.querySelector("[data-color-code-type]");
    if (codeInput) {
      codeInput.value = color.toUpperCase();
      codeInput.setCustomValidity("");
    }
    const resetButton = row?.querySelector("[data-reset-color]");
    if (resetButton) resetButton.disabled = color === getDefaultItemTypeColor(type);
  });
}

export function renderSidePanel() {
  const date = state.selectedDate || state.trip.startDate;
  const items = getItemsForDate(date);
  const showTimezone = shouldShowTimezoneForItems(items);
  const city = getPrimaryCity(date);
  const allWarnings = getWarnings();
  const warnings = allWarnings.filter((warning) => warning.date === date);
  const selectedDayPanel = isMobileViewport()
    ? ""
    : `
    <article class="selected-day-panel">
      <p class="eyebrow">Selected day</p>
      <h2>${escapeHtml(formatDateLong(date))}</h2>
      <p class="muted">${escapeHtml(city || "No primary city yet")}</p>
      <div class="status-line">
        <span class="badge">${items.length} item${items.length === 1 ? "" : "s"}</span>
        ${warnings.length ? `<span class="badge warning">${warnings.length} warning${warnings.length === 1 ? "" : "s"}</span>` : ""}
      </div>
      <div class="day-actions">
        <button class="primary-button" data-action="add-on-day" data-date="${date}" type="button">Add to this day</button>
        <button class="secondary-button" data-action="go-day" type="button">Review day</button>
      </div>
      <div class="item-stack">
        ${
          items.length
            ? items
                .slice(0, 6)
                .map(
                  (item) => `
                    <button class="item-pill" ${renderItemTypeStyle(item.type)} data-action="edit" data-id="${item.id}" data-type="${escapeHtml(item.type)}" type="button">
                      ${renderStatusIcon(item.status)}
                      <span class="item-time">${escapeHtml(formatItemTime(item, { showTimezone }))}</span>
                      <span class="item-title">${escapeHtml(item.title)}</span>
                      <span class="item-meta">${escapeHtml(item.status)}</span>
                    </button>
                  `,
                )
                .join("")
            : `<div class="empty-state">No plans on this date.</div>`
        }
      </div>
    </article>
  `;
  els.sidePanel.innerHTML = `
    ${selectedDayPanel}
    <details class="warnings-panel" ${state.warningsExpanded ? "open" : ""}>
      <summary>
        <span>
          <span class="eyebrow">Warnings</span>
          <strong>Planning checks</strong>
        </span>
        <span class="badge warning">${allWarnings.length} warning${allWarnings.length === 1 ? "" : "s"}</span>
      </summary>
      <div class="warning-list">
        ${
          allWarnings.length
            ? allWarnings.map(renderWarningItem).join("")
            : `<div class="empty-state compact">No warnings right now.</div>`
        }
      </div>
    </details>
  `;
  bindDynamicActions(els.sidePanel);
  bindWarningsPanel(els.sidePanel);
}

export function renderPlanningTodos() {
  const todos = getTripTodos();
  const filteredTodos = getFilteredPlanningTodos();
  const completedTodos = todos.filter((todo) => todo.done).length;
  els.planningView.innerHTML = `
    ${renderPlanningDueCalendar(filteredTodos)}
    <section class="todo-panel section-block" aria-label="Planning todos">
      <div class="todo-header">
        <div>
          <p class="eyebrow">Planning todos</p>
          <h3>Checklist</h3>
        </div>
        <span class="muted">${completedTodos}/${todos.length} done</span>
      </div>
      <form class="todo-form" data-todo-form>
        <input name="todoText" type="text" placeholder="Add a planning todo" aria-label="New planning todo" />
        <button class="secondary-button" type="submit">Add</button>
        <div class="todo-cost-row">
          <input name="todoCost" type="number" min="0" step="0.01" placeholder="Cost" aria-label="Todo cost" />
          <select name="todoCurrency" aria-label="Todo cost currency">${renderCurrencyOptions()}</select>
          <input name="todoDueDate" type="date" aria-label="Todo due date" />
        </div>
      </form>
      <div class="todo-list">
        ${
          filteredTodos.length
            ? filteredTodos.map(({ todo, subtodos }) => renderTodoItem(todo, subtodos)).join("")
            : todos.length
              ? `<div class="empty-state compact">No todos match the current filters.</div>`
              : `<div class="empty-state compact">No todos yet.</div>`
        }
      </div>
    </section>
  `;
  bindTodoActions(els.planningView);
  bindPlanningDueCalendar(els.planningView);
}

export function renderPlanningDueCalendar(filteredTodos) {
  const dueEntries = getPlanningDueEntries(filteredTodos);
  return `
    <section class="section-block planning-calendar-panel" aria-label="Todo due date calendar">
      <div class="section-header">
        <div>
          <p class="eyebrow">Planning calendar</p>
          <h3>Due dates</h3>
        </div>
        <span class="muted">${dueEntries.length} item${dueEntries.length === 1 ? "" : "s"} with due dates</span>
      </div>
      ${
        dueEntries.length
          ? renderPlanningDueMonths(dueEntries).join("")
          : `<div class="empty-state compact">No due dates to show for the current filters.</div>`
      }
    </section>
  `;
}

export function getPlanningDueEntries(filteredTodos) {
  return filteredTodos
    .flatMap(({ todo, subtodos }) => {
      const entries = [];
      if (todo.dueDate) {
        entries.push({
          id: todo.id,
          parentId: "",
          title: todo.text,
          dueDate: todo.dueDate,
          done: todo.done,
          kind: "todo",
          detail: subtodos.length ? `${subtodos.length} sub item${subtodos.length === 1 ? "" : "s"}` : "Todo",
        });
      }
      subtodos.forEach((subtodo) => {
        if (!subtodo.dueDate) return;
        entries.push({
          id: subtodo.id,
          parentId: todo.id,
          title: subtodo.text,
          dueDate: subtodo.dueDate,
          done: subtodo.done,
          kind: "subtodo",
          detail: todo.text,
        });
      });
      return entries;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
}

export function renderPlanningDueMonths(dueEntries) {
  const startDate = parseLocalDate(dueEntries[0].dueDate);
  const endDate = parseLocalDate(dueEntries[dueEntries.length - 1].dueDate);
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const months = [];
  for (const cursor = new Date(startMonth); cursor <= endMonth; cursor.setMonth(cursor.getMonth() + 1)) {
    months.push(renderPlanningDueMonth(new Date(cursor), dueEntries));
  }
  return months;
}

export function renderPlanningDueMonth(monthDate, dueEntries) {
  const today = toIsoDate(new Date());
  const monthLabel = monthDate.toLocaleDateString([], { month: "long", year: "numeric" });
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstWeekday = getMondayFirstWeekday(first);
  const lastWeekday = getMondayFirstWeekday(last);
  const daysInMonth = last.getDate();
  const dayEntries = new Map();
  dueEntries.forEach((entry) => {
    if (!dayEntries.has(entry.dueDate)) dayEntries.set(entry.dueDate, []);
    dayEntries.get(entry.dueDate).push(entry);
  });

  const cells = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(`<div class="due-day-cell empty" aria-hidden="true"></div>`);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cursor = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const iso = toIsoDate(cursor);
    const entries = dayEntries.get(iso) || [];
    cells.push(`
      <div class="due-day-cell ${entries.length ? "has-items" : ""} ${iso === today ? "today" : ""}" data-due-drop-date="${iso}">
        <div class="due-day-header">
          <span class="date-number">${day}</span>
          ${entries.length ? `<span class="badge">${entries.length}</span>` : ""}
        </div>
        <div class="due-entry-list">
          ${entries.length ? entries.map(renderPlanningDueEntry).join("") : ""}
        </div>
      </div>
    `);
  }
  for (let index = lastWeekday + 1; index < 7; index += 1) {
    cells.push(`<div class="due-day-cell empty" aria-hidden="true"></div>`);
  }

  return `
    <section class="planning-month-block">
      <div class="planning-month-header">
        <h4>${escapeHtml(monthLabel)}</h4>
      </div>
      <div class="weekday-row">
        ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<div class="weekday">${day}</div>`).join("")}
      </div>
      <div class="due-calendar-grid">${cells.join("")}</div>
    </section>
  `;
}

export function getMondayFirstWeekday(date) {
  return (date.getDay() + 6) % 7;
}

export function renderPlanningDueEntry(entry) {
  return `
    <div class="due-entry-pill ${entry.done ? "done" : "open"} ${entry.kind}" draggable="true" data-due-entry-id="${entry.id}" data-due-entry-kind="${entry.kind}" data-due-parent-id="${entry.parentId}">
      <span class="due-entry-title">${escapeHtml(entry.title)}</span>
      <span class="due-entry-meta">${escapeHtml(entry.detail)}</span>
    </div>
  `;
}

export function bindPlanningDueCalendar(container) {
  const dropCells = container.querySelectorAll("[data-due-drop-date]");
  const dueEntries = container.querySelectorAll("[data-due-entry-id]");

  dueEntries.forEach((entry) => {
    entry.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify({
        id: entry.dataset.dueEntryId,
        kind: entry.dataset.dueEntryKind,
        parentId: entry.dataset.dueParentId || "",
      }));
      entry.classList.add("dragging");
    });
    entry.addEventListener("dragend", () => {
      entry.classList.remove("dragging");
      dropCells.forEach((cell) => cell.classList.remove("drag-over"));
    });
  });

  dropCells.forEach((cell) => {
    cell.addEventListener("dragover", (event) => {
      event.preventDefault();
      cell.classList.add("drag-over");
    });
    cell.addEventListener("dragleave", () => {
      cell.classList.remove("drag-over");
    });
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      cell.classList.remove("drag-over");
      let payload = null;
      try {
        payload = JSON.parse(event.dataTransfer.getData("text/plain"));
      } catch {
        payload = null;
      }
      if (!payload?.id || !payload?.kind) return;
      updatePlanningEntryDueDate(payload, cell.dataset.dueDropDate);
    });
  });
}

export function updatePlanningEntryDueDate(payload, dueDate) {
  const normalizedDueDate = normalizeDueDate(dueDate);
  if (!normalizedDueDate) return;
  const now = new Date().toISOString();
  if (payload.kind === "todo") {
    state.trip.todos = (state.trip.todos || []).map((todo) =>
      todo.id === payload.id
        ? { ...todo, dueDate: normalizedDueDate, updatedAt: now }
        : todo,
    );
  }
  if (payload.kind === "subtodo") {
    state.trip.todos = (state.trip.todos || []).map((todo) =>
      todo.id === payload.parentId
        ? {
            ...todo,
            subtodos: (todo.subtodos || []).map((subtodo) =>
              subtodo.id === payload.id
                ? { ...subtodo, dueDate: normalizedDueDate, updatedAt: now }
                : subtodo,
            ),
            updatedAt: now,
          }
        : todo,
    );
  }
  state.trip.updatedAt = now;
  render();
}

export function renderWarningItem(warning) {
  return `
    <div class="warning-item">
      <div>
        <strong>${escapeHtml(warning.type)}</strong>
        <span>${escapeHtml(warning.date ? formatDateShort(warning.date) : "No date")}</span>
      </div>
      <p>${escapeHtml(warning.message)}</p>
    </div>
  `;
}

export function renderTodoItem(todo, subtodos = getSubtodos(todo)) {
  const allSubtodos = getSubtodos(todo);
  const isExpanded = isTodoExpanded(todo.id);
  const isEditing = state.editingTodoId === todo.id;
  const hasIncompleteSubtodos = allSubtodos.some((subtodo) => !subtodo.done);
  const canCheckParent = !allSubtodos.length || !hasIncompleteSubtodos;
  return `
    <div class="todo-group ${isExpanded ? "expanded" : ""}" data-todo-id="${todo.id}">
      <div class="todo-item ${todo.done ? "done" : ""} ${isEditing ? "editing" : ""}" draggable="true" data-todo-id="${todo.id}">
        <button class="todo-expand-button" data-todo-action="expand" data-id="${todo.id}" type="button" aria-expanded="${isExpanded}" aria-label="${isExpanded ? "Collapse subtodos" : "Expand subtodos"}">
          ${isExpanded ? "-" : "+"}
        </button>
        <span class="todo-drag-handle" aria-hidden="true">Drag</span>
        ${
          isEditing
            ? renderTodoEditForm(todo)
            : `
              <label title="${canCheckParent ? "" : "Complete all subtodos before checking this off."}">
                <input data-todo-action="toggle" data-id="${todo.id}" type="checkbox" ${todo.done ? "checked" : ""} ${canCheckParent ? "" : "disabled"} />
                <button class="todo-text-button" data-todo-action="edit" data-id="${todo.id}" type="button">${escapeHtml(todo.text)}</button>
              </label>
            `
        }
        ${!isEditing && todo.dueDate ? `<span class="todo-due-badge ${escapeHtml(getTodoDueBucket(todo.dueDate) || "due-later")}">${escapeHtml(formatTodoDueDate(todo.dueDate))}</span>` : ""}
        ${!isEditing && todo.cost ? `<span class="todo-cost-badge">${escapeHtml(formatCostAmount(todo.cost, todo.currency))}</span>` : ""}
        ${!isEditing && subtodos.length ? `<span class="subtodo-count">${subtodos.length} sub</span>` : ""}
        ${!isEditing ? `<button class="icon-button todo-delete-button" data-todo-action="delete" data-id="${todo.id}" type="button" aria-label="Delete todo">x</button>` : ""}
      </div>
      <div class="subtodo-panel" ${isExpanded ? "" : "hidden"}>
        <form class="subtodo-form" data-subtodo-form data-parent-id="${todo.id}">
          <input name="subtodoText" type="text" placeholder="Add a sub todo" aria-label="New sub todo" />
          <button class="secondary-button" type="submit">Add</button>
          <div class="todo-cost-row">
            <input name="subtodoCost" type="number" min="0" step="0.01" placeholder="Cost" aria-label="Sub todo cost" />
            <select name="subtodoCurrency" aria-label="Sub todo cost currency">${renderCurrencyOptions()}</select>
            <input name="subtodoDueDate" type="date" aria-label="Sub todo due date" />
          </div>
        </form>
        <div class="subtodo-list">
          ${
            subtodos.length
              ? subtodos.map((subtodo) => renderSubtodoItem(todo.id, subtodo)).join("")
              : `<div class="empty-state compact">No sub todos yet.</div>`
          }
        </div>
      </div>
    </div>
  `;
}

export function renderSubtodoItem(parentId, subtodo) {
  const isEditing = state.editingSubtodo?.parentId === parentId && state.editingSubtodo?.id === subtodo.id;
  return `
    <div class="subtodo-item ${subtodo.done ? "done" : ""} ${isEditing ? "editing" : ""}" draggable="true" data-parent-id="${parentId}" data-subtodo-id="${subtodo.id}">
      <span class="todo-drag-handle" aria-hidden="true">Drag</span>
      ${
        isEditing
          ? renderSubtodoEditForm(parentId, subtodo)
          : `
            <label>
              <input data-subtodo-action="toggle" data-parent-id="${parentId}" data-id="${subtodo.id}" type="checkbox" ${subtodo.done ? "checked" : ""} />
              <button class="todo-text-button" data-subtodo-action="edit" data-parent-id="${parentId}" data-id="${subtodo.id}" type="button">${escapeHtml(subtodo.text)}</button>
            </label>
          `
      }
      ${!isEditing && subtodo.dueDate ? `<span class="todo-due-badge ${escapeHtml(getTodoDueBucket(subtodo.dueDate) || "due-later")}">${escapeHtml(formatTodoDueDate(subtodo.dueDate))}</span>` : ""}
      ${!isEditing && subtodo.cost ? `<span class="todo-cost-badge">${escapeHtml(formatCostAmount(subtodo.cost, subtodo.currency))}</span>` : ""}
      ${!isEditing ? `<button class="icon-button todo-delete-button" data-subtodo-action="delete" data-parent-id="${parentId}" data-id="${subtodo.id}" type="button" aria-label="Delete sub todo">x</button>` : ""}
    </div>
  `;
}

export function renderTodoEditForm(todo) {
  return `
    <form class="todo-edit-form" data-todo-edit-form data-id="${todo.id}">
      <input name="todoText" type="text" value="${escapeHtml(todo.text)}" aria-label="Edit todo text" />
      <div class="todo-cost-row">
        <input name="todoCost" type="number" min="0" step="0.01" value="${escapeHtml(todo.cost || "")}" placeholder="Cost" aria-label="Todo cost" />
        <select name="todoCurrency" aria-label="Todo cost currency">${renderCurrencyOptions(todo.currency)}</select>
        <input name="todoDueDate" type="date" value="${escapeHtml(todo.dueDate || "")}" aria-label="Todo due date" />
      </div>
      <span class="todo-edit-actions">
        <button class="secondary-button compact-button" type="submit">Save</button>
        <button class="secondary-button compact-button" data-todo-action="cancel-edit" type="button">Cancel</button>
      </span>
    </form>
  `;
}

export function renderSubtodoEditForm(parentId, subtodo) {
  return `
    <form class="todo-edit-form" data-subtodo-edit-form data-parent-id="${parentId}" data-id="${subtodo.id}">
      <input name="subtodoText" type="text" value="${escapeHtml(subtodo.text)}" aria-label="Edit sub todo text" />
      <div class="todo-cost-row">
        <input name="subtodoCost" type="number" min="0" step="0.01" value="${escapeHtml(subtodo.cost || "")}" placeholder="Cost" aria-label="Sub todo cost" />
        <select name="subtodoCurrency" aria-label="Sub todo cost currency">${renderCurrencyOptions(subtodo.currency)}</select>
        <input name="subtodoDueDate" type="date" value="${escapeHtml(subtodo.dueDate || "")}" aria-label="Sub todo due date" />
      </div>
      <span class="todo-edit-actions">
        <button class="secondary-button compact-button" type="submit">Save</button>
        <button class="secondary-button compact-button" data-subtodo-action="cancel-edit" type="button">Cancel</button>
      </span>
    </form>
  `;
}

export function getSelectedFilterValues(select) {
  const values = Array.from(select.selectedOptions || []).map((option) => option.value);
  const specificValues = values.filter((value) => value !== "all");
  return specificValues.length ? specificValues : ["all"];
}

export function setSelectedFilterValues(select, values) {
  const selectedValues = normalizeFilterValues(values);
  Array.from(select.options).forEach((option) => {
    option.selected = selectedValues.includes(option.value);
  });
}

export function getFilteredPlanningTodos() {
  const activeFilters = hasActiveTodoFilters();
  return getTripTodos()
    .map((todo) => {
      const subtodos = getSubtodos(todo).filter((subtodo) => todoEntryMatchesFilters(subtodo));
      const todoMatches = todoEntryMatchesFilters(todo);
      if (!todoMatches && !subtodos.length) return null;
      return {
        todo,
        subtodos: activeFilters ? subtodos : getSubtodos(todo),
      };
    })
    .filter(Boolean);
}

export function hasActiveTodoFilters() {
  return (
    !normalizeFilterValues(state.todoFilters.status).includes("all")
    || !normalizeFilterValues(state.todoFilters.dueDate).includes("all")
    || Boolean(state.todoFilters.search)
  );
}

export function todoEntryMatchesFilters(entry) {
  state.todoFilters.status = normalizeFilterValues(state.todoFilters.status);
  state.todoFilters.dueDate = normalizeFilterValues(state.todoFilters.dueDate);
  const statusValue = entry.done ? "done" : "open";
  const dueBucket = getTodoDueBucket(entry.dueDate);
  const statusMatch = filterAllows(state.todoFilters.status, statusValue);
  const dueDateMatch = state.todoFilters.dueDate.includes("all") || (dueBucket && state.todoFilters.dueDate.includes(dueBucket));
  const haystack = [entry.text, entry.dueDate, entry.notes, entry.cost, entry.currency]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const searchMatch = !state.todoFilters.search || haystack.includes(state.todoFilters.search);
  return statusMatch && dueDateMatch && searchMatch;
}

export function formatTodoDueDate(dueDate) {
  const bucket = getTodoDueBucket(dueDate);
  const prefix = bucket === "past-due" ? "Past due" : "Due";
  return `${prefix} ${formatDateShort(dueDate)}`;
}

export function bindDynamicActions(container) {
  container.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      const action = element.dataset.action;
      if (action === "edit") openItemDialog(element.dataset.id);
      if (action === "select-day") {
        state.selectedDate = element.dataset.date;
        render();
      }
      if (action === "add-on-day") openItemDialog(null, element.dataset.date);
      if (action === "go-day") {
        if (element.dataset.date) state.selectedDate = element.dataset.date;
        state.view = "day";
        render();
      }
    });
  });
}

export function bindTodoActions(container) {
  const form = container.querySelector("[data-todo-form]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.elements.todoText;
    addTodo(input.value, form.elements.todoCost.value, form.elements.todoCurrency.value, form.elements.todoDueDate.value);
  });

  container.querySelectorAll("[data-todo-action='toggle']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleTodo(checkbox.dataset.id, checkbox.checked));
  });

  container.querySelectorAll("[data-todo-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteTodo(button.dataset.id));
  });

  container.querySelectorAll("[data-todo-action='edit']").forEach((button) => {
    button.addEventListener("click", () => startTodoEdit(button.dataset.id));
  });

  container.querySelectorAll("[data-todo-action='cancel-edit']").forEach((button) => {
    button.addEventListener("click", () => cancelTodoEdit());
  });

  container.querySelectorAll("[data-todo-edit-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      updateTodoText(form.dataset.id, form.elements.todoText.value, form.elements.todoCost.value, form.elements.todoCurrency.value, form.elements.todoDueDate.value);
    });
  });

  container.querySelectorAll("[data-todo-action='expand']").forEach((button) => {
    button.addEventListener("click", () => toggleTodoExpanded(button.dataset.id));
  });

  container.querySelectorAll("[data-subtodo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addSubtodo(form.dataset.parentId, form.elements.subtodoText.value, form.elements.subtodoCost.value, form.elements.subtodoCurrency.value, form.elements.subtodoDueDate.value);
    });
  });

  container.querySelectorAll("[data-subtodo-action='toggle']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => toggleSubtodo(checkbox.dataset.parentId, checkbox.dataset.id, checkbox.checked));
  });

  container.querySelectorAll("[data-subtodo-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deleteSubtodo(button.dataset.parentId, button.dataset.id));
  });

  container.querySelectorAll("[data-subtodo-action='edit']").forEach((button) => {
    button.addEventListener("click", () => startSubtodoEdit(button.dataset.parentId, button.dataset.id));
  });

  container.querySelectorAll("[data-subtodo-action='cancel-edit']").forEach((button) => {
    button.addEventListener("click", () => cancelTodoEdit());
  });

  container.querySelectorAll("[data-subtodo-edit-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      updateSubtodoText(form.dataset.parentId, form.dataset.id, form.elements.subtodoText.value, form.elements.subtodoCost.value, form.elements.subtodoCurrency.value, form.elements.subtodoDueDate.value);
    });
  });

  container.querySelectorAll(".todo-item[data-todo-id]").forEach((item) => {
    item.addEventListener("click", (event) => {
      if (event.target.closest("button, input, label, form, .todo-drag-handle")) return;
      toggleTodoExpanded(item.dataset.todoId);
    });
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.dataset.todoId);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging", "drag-over-before", "drag-over-after");
      container.querySelectorAll(".todo-item").forEach((row) => row.classList.remove("drag-over-before", "drag-over-after"));
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      const position = getTodoDropPosition(event, item);
      item.classList.toggle("drag-over-before", position === "before");
      item.classList.toggle("drag-over-after", position === "after");
      event.dataTransfer.dropEffect = "move";
    });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over-before", "drag-over-after"));
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const position = getTodoDropPosition(event, item);
      item.classList.remove("drag-over-before", "drag-over-after");
      reorderTodo(event.dataTransfer.getData("text/plain"), item.dataset.todoId, position);
    });
  });

  container.querySelectorAll(".subtodo-item[data-subtodo-id]").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.dataset.subtodoId);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging", "drag-over-before", "drag-over-after");
      container.querySelectorAll(".subtodo-item").forEach((row) => row.classList.remove("drag-over-before", "drag-over-after"));
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const position = getTodoDropPosition(event, item);
      item.classList.toggle("drag-over-before", position === "before");
      item.classList.toggle("drag-over-after", position === "after");
      event.dataTransfer.dropEffect = "move";
    });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over-before", "drag-over-after"));
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const position = getTodoDropPosition(event, item);
      item.classList.remove("drag-over-before", "drag-over-after");
      reorderSubtodo(item.dataset.parentId, event.dataTransfer.getData("text/plain"), item.dataset.subtodoId, position);
    });
  });
}

export function getTodoDropPosition(event, item) {
  const rect = item.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

export function isTodoExpanded(id) {
  return state.expandedTodoIds.includes(id);
}

export function toggleTodoExpanded(id, expanded = !isTodoExpanded(id)) {
  state.expandedTodoIds = expanded
    ? [...new Set([...state.expandedTodoIds, id])]
    : state.expandedTodoIds.filter((todoId) => todoId !== id);
  render();
}

export function startTodoEdit(id) {
  state.editingTodoId = id;
  state.editingSubtodo = null;
  render();
}

export function startSubtodoEdit(parentId, id) {
  state.editingTodoId = null;
  state.editingSubtodo = { parentId, id };
  render();
}

export function cancelTodoEdit() {
  state.editingTodoId = null;
  state.editingSubtodo = null;
  render();
}

export function bindWarningsPanel(container) {
  const details = container.querySelector(".warnings-panel");
  details?.addEventListener("toggle", () => {
    state.warningsExpanded = details.open;
  });
}

export function bindCalendarDayCells() {
  els.calendarView.querySelectorAll(".day-cell[data-date]").forEach((cell) => {
    cell.addEventListener("click", (event) => {
      if (event.target.closest("[data-action='edit']")) return;
      state.selectedDate = cell.dataset.date;
      render();
    });
  });
}

export function bindCalendarItemDragAndDrop() {
  const cells = Array.from(els.calendarView.querySelectorAll(".day-cell[data-date]"));
  const draggableItems = Array.from(els.calendarView.querySelectorAll("[data-calendar-drag='true'][data-id]"));

  draggableItems.forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.dataset.id);
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      cells.forEach((cell) => cell.classList.remove("drag-over"));
    });
  });

  cells.forEach((cell) => {
    cell.addEventListener("dragover", (event) => {
      event.preventDefault();
      cell.classList.add("drag-over");
      event.dataTransfer.dropEffect = "move";
    });
    cell.addEventListener("dragleave", (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      cell.classList.remove("drag-over");
    });
    cell.addEventListener("drop", (event) => {
      event.preventDefault();
      cell.classList.remove("drag-over");
      moveItemToCalendarDate(event.dataTransfer.getData("text/plain"), cell.dataset.date);
    });
  });
}

export function moveItemToCalendarDate(id, targetDate) {
  if (!id || !targetDate) return;
  const item = state.trip.items.find((entry) => entry.id === id);
  if (!item || !item.startDateTime) return;
  if (getDatePart(item.startDateTime) === targetDate) return;

  const now = new Date().toISOString();
  state.trip.items = state.trip.items.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          startDateTime: shiftDateTimeToDate(entry.startDateTime, targetDate),
          endDateTime: shiftEndDateTimeToDate(entry, targetDate),
          updatedAt: now,
        }
      : entry,
  );
  state.selectedDate = targetDate;
  render();
}

export function updateTripSettings() {
  state.trip.title = els.tripTitle.value || "Untitled trip";
  state.trip.startDate = els.tripStart.value || state.trip.startDate;
  state.trip.endDate = els.tripEnd.value || state.trip.endDate;
  state.trip.homeTimezone = els.tripTimezone.value || DEFAULT_TIMEZONE;
  if (state.trip.endDate < state.trip.startDate) {
    state.trip.endDate = state.trip.startDate;
  }
  if (state.selectedDate < state.trip.startDate || state.selectedDate > state.trip.endDate) {
    state.selectedDate = state.trip.startDate;
  }
  render();
}

export function openItemDialog(id = null, date = null) {
  const item = id ? state.trip.items.find((entry) => entry.id === id) : null;
  populatePeopleSelect(item?.people || []);
  els.itemForm.reset();
  els.itemId.value = item?.id || "";
  els.itemTitle.value = item?.title || "";
  els.itemType.value = item?.type || "Activity";
  els.itemStatus.value = item?.status || "Idea";
  els.itemStartTbd.checked = Boolean(item?.startTbd);
  els.itemStartTimeTbd.checked = Boolean(item?.startTimeTbd);
  els.itemEndTbd.checked = Boolean(item?.endTbd);
  els.itemEndTimeTbd.checked = Boolean(item?.endTimeTbd);
  const defaultStart = date ? `${date}T09:00` : `${state.selectedDate}T09:00`;
  const defaultEnd = date ? `${date}T10:00` : `${state.selectedDate}T10:00`;
  const startValue = item?.startDateTime || defaultStart;
  const endValue = item?.endDateTime || defaultEnd;
  els.itemStartDate.value = item?.startTbd ? "" : getDatePart(startValue);
  els.itemStartTime.value = item?.startTbd || item?.startTimeTbd ? "" : getTimePart(startValue);
  els.itemStartTimezone.value = item?.startTimezone || item?.timezone || DEFAULT_TIMEZONE;
  els.itemEndDate.value = item?.endTbd ? "" : getDatePart(endValue);
  els.itemEndTime.value = item?.endTbd || item?.endTimeTbd ? "" : getTimePart(endValue);
  els.itemEndTimezone.value = item?.endTimezone || item?.timezone || DEFAULT_TIMEZONE;
  els.itemCity.value = item?.city || "";
  els.itemLocation.value = item?.location || "";
  els.itemDepartureCity.value = item?.departureCity || "";
  els.itemArrivalCity.value = item?.arrivalCity || "";
  els.itemAirline.value = item?.airline || "";
  setSelectedPeople(item?.people || []);
  els.itemConfirmation.value = item?.confirmationCode || "";
  els.itemCost.value = item?.cost || "";
  els.itemCurrency.value = normalizeCurrency(item?.currency);
  els.itemTags.value = item?.tags?.join(", ") || "";
  els.itemLinks.value = item?.links?.[0] || "";
  els.itemNotes.value = item?.notes || "";
  els.dialogTitle.textContent = item ? "Edit item" : "Add item";
  els.dialogEyebrow.textContent = item ? item.type : "Plan item";
  els.deleteItemButton.style.visibility = item ? "visible" : "hidden";
  els.copyItemSection.hidden = !item;
  els.copyItemDate.value = getDatePart(item?.startDateTime) || date || state.selectedDate || state.trip.startDate;
  updateItemFormForType();
  updateDateTimeTbdControls();
  els.itemDialog.showModal();
}

export function closeItemDialog() {
  els.itemDialog.close();
}

export function saveItemFromForm(event) {
  event.preventDefault();
  const id = els.itemId.value || createId();
  const existing = state.trip.items.find((item) => item.id === id);
  const isFlight = els.itemType.value === "Flight";
  const startTbd = els.itemStartTbd.checked;
  const endTbd = els.itemEndTbd.checked;
  const startTimeTbd = els.itemStartTimeTbd.checked;
  const endTimeTbd = els.itemEndTimeTbd.checked;
  const item = normalizeItem({
    ...(existing || {}),
    id,
    title: els.itemTitle.value.trim(),
    type: els.itemType.value,
    status: els.itemStatus.value,
    startTbd,
    endTbd,
    startTimeTbd,
    endTimeTbd,
    startDateTime: startTbd ? "" : buildDateTimeValue(els.itemStartDate.value, els.itemStartTime.value, startTimeTbd),
    startTimezone: els.itemStartTimezone.value || DEFAULT_TIMEZONE,
    endDateTime: endTbd ? "" : buildDateTimeValue(els.itemEndDate.value, els.itemEndTime.value, endTimeTbd),
    endTimezone: els.itemEndTimezone.value || DEFAULT_TIMEZONE,
    timezone: els.itemStartTimezone.value || DEFAULT_TIMEZONE,
    departureCity: isFlight ? els.itemDepartureCity.value.trim() : "",
    arrivalCity: isFlight ? els.itemArrivalCity.value.trim() : "",
    airline: isFlight ? els.itemAirline.value.trim() : "",
    city: isFlight ? els.itemArrivalCity.value.trim() : els.itemCity.value.trim(),
    location: isFlight ? "" : els.itemLocation.value.trim(),
    people: getSelectedPeople(),
    confirmationCode: els.itemConfirmation.value.trim(),
    cost: els.itemCost.value,
    currency: els.itemCurrency.value,
    tags: splitList(els.itemTags.value),
    links: splitList(els.itemLinks.value),
    notes: els.itemNotes.value.trim(),
    updatedAt: new Date().toISOString(),
  });

  if (item.endDateTime && item.startDateTime && item.endDateTime < item.startDateTime) {
    item.endDateTime = item.startDateTime;
  }

  if (existing) {
    state.trip.items = state.trip.items.map((entry) => (entry.id === id ? item : entry));
  } else {
    state.trip.items.push(item);
  }

  state.selectedDate = getDatePart(item.startDateTime) || state.selectedDate;
  closeItemDialog();
  render();
}

export function deleteCurrentItem() {
  const id = els.itemId.value;
  if (!id) return;
  state.trip.items = state.trip.items.filter((item) => item.id !== id);
  closeItemDialog();
  render();
}

export function copyCurrentItemToDate() {
  const id = els.itemId.value;
  const targetDate = els.copyItemDate.value;
  const source = state.trip.items.find((item) => item.id === id);
  if (!source || !targetDate) return;

  const copy = normalizeItem({
    ...source,
    id: createId(),
    startDateTime: shiftDateTimeToDate(source.startDateTime, targetDate),
    endDateTime: shiftEndDateTimeToDate(source, targetDate),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  state.trip.items.push(copy);
  state.selectedDate = targetDate;
  closeItemDialog();
  render();
}

export function printCalendar() {
  state.view = "calendar";
  render();
  requestAnimationFrame(() => window.print());
}

export function exportTrip() {
  const blob = new Blob([JSON.stringify(state.trip, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.trip.title) || "trip"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importTrip(event) {
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedTrips = Array.isArray(parsed.trips) ? normalizeStore(parsed).trips : [normalizeTrip(parsed)];
      importedTrips.forEach((trip) => {
        trip.id = createId();
        trip.title = getUniqueTripTitle(trip.title);
        state.store.trips.push(trip);
      });
      openTrip(importedTrips[0].id);
    } catch {
      window.alert("That JSON file could not be imported.");
    } finally {
      els.importInput.value = "";
    }
  });
  reader.readAsText(file);
}

export function getUniqueTripTitle(title) {
  const existingTitles = new Set(state.store.trips.map((trip) => trip.title));
  if (!existingTitles.has(title)) return title;
  let index = 2;
  while (existingTitles.has(`${title} ${index}`)) index += 1;
  return `${title} ${index}`;
}

export function addTodo(text, cost = "", currency = "USD", dueDate = "") {
  const normalized = normalizeTodo({ text, cost, currency, dueDate, order: getNextTodoOrder() });
  if (!normalized.text) return;
  state.trip.todos = [...(state.trip.todos || []), normalized];
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function getNextTodoOrder() {
  return Math.max(-1, ...(state.trip.todos || []).map((todo) => Number(todo.order) || 0)) + 1;
}

export function getNextSubtodoOrder(parent) {
  return Math.max(-1, ...(parent.subtodos || []).map((subtodo) => Number(subtodo.order) || 0)) + 1;
}

export function reorderTodo(draggedId, targetId, position = "before") {
  if (!draggedId || !targetId || draggedId === targetId) return;
  const ordered = getTripTodos();
  const draggedIndex = ordered.findIndex((todo) => todo.id === draggedId);
  if (draggedIndex < 0) return;

  const [dragged] = ordered.splice(draggedIndex, 1);
  const targetIndex = ordered.findIndex((todo) => todo.id === targetId);
  if (targetIndex < 0) return;
  ordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, dragged);
  const orderById = new Map(ordered.map((todo, index) => [todo.id, index]));
  state.trip.todos = (state.trip.todos || []).map((todo) => ({
    ...todo,
    order: orderById.get(todo.id) ?? todo.order,
    updatedAt: todo.id === draggedId ? new Date().toISOString() : todo.updatedAt,
  }));
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function updateTodoText(id, text, cost = "", currency = "USD", dueDate = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return;
  const now = new Date().toISOString();
  state.trip.todos = (state.trip.todos || []).map((todo) =>
    todo.id === id
      ? {
          ...todo,
          text: trimmed,
          cost: normalizeCostValue(cost),
          currency: normalizeCurrency(currency),
          dueDate: normalizeDueDate(dueDate),
          updatedAt: now,
        }
      : todo,
  );
  state.editingTodoId = null;
  state.trip.updatedAt = now;
  render();
}

export function addSubtodo(parentId, text, cost = "", currency = "USD", dueDate = "") {
  const now = new Date().toISOString();
  state.trip.todos = (state.trip.todos || []).map((todo) => {
    if (todo.id !== parentId) return todo;
    const subtodo = normalizeSubtodo({ text, cost, currency, dueDate, order: getNextSubtodoOrder(todo) });
    if (!subtodo.text) return todo;
    return {
      ...todo,
      done: false,
      subtodos: [...(todo.subtodos || []), subtodo],
      updatedAt: now,
    };
  });
  state.trip.updatedAt = now;
  toggleTodoExpanded(parentId, true);
}

export function toggleSubtodo(parentId, id, done) {
  const now = new Date().toISOString();
  state.trip.todos = (state.trip.todos || []).map((todo) => {
    if (todo.id !== parentId) return todo;
    const subtodos = (todo.subtodos || []).map((subtodo) =>
      subtodo.id === id
        ? {
            ...subtodo,
            done,
            updatedAt: now,
          }
        : subtodo,
    );
    return {
      ...todo,
      done: subtodos.some((subtodo) => !subtodo.done) ? false : todo.done,
      subtodos,
      updatedAt: now,
    };
  });
  state.trip.updatedAt = now;
  render();
}

export function deleteSubtodo(parentId, id) {
  const now = new Date().toISOString();
  state.trip.todos = (state.trip.todos || []).map((todo) =>
    todo.id === parentId
      ? {
          ...todo,
          subtodos: (todo.subtodos || []).filter((subtodo) => subtodo.id !== id),
          updatedAt: now,
        }
      : todo,
  );
  if (state.editingSubtodo?.parentId === parentId && state.editingSubtodo?.id === id) {
    state.editingSubtodo = null;
  }
  state.trip.updatedAt = now;
  render();
}

export function updateSubtodoText(parentId, id, text, cost = "", currency = "USD", dueDate = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return;
  const now = new Date().toISOString();
  state.trip.todos = (state.trip.todos || []).map((todo) =>
    todo.id === parentId
      ? {
          ...todo,
          subtodos: (todo.subtodos || []).map((subtodo) =>
            subtodo.id === id
              ? {
                  ...subtodo,
                  text: trimmed,
                  cost: normalizeCostValue(cost),
                  currency: normalizeCurrency(currency),
                  dueDate: normalizeDueDate(dueDate),
                  updatedAt: now,
                }
              : subtodo,
          ),
          updatedAt: now,
        }
      : todo,
  );
  state.editingSubtodo = null;
  state.trip.updatedAt = now;
  render();
}

export function reorderSubtodo(parentId, draggedId, targetId, position = "before") {
  if (!parentId || !draggedId || !targetId || draggedId === targetId) return;
  const now = new Date().toISOString();
  state.trip.todos = (state.trip.todos || []).map((todo) => {
    if (todo.id !== parentId) return todo;
    const ordered = getSubtodos(todo);
    const draggedIndex = ordered.findIndex((subtodo) => subtodo.id === draggedId);
    if (draggedIndex < 0) return todo;

    const [dragged] = ordered.splice(draggedIndex, 1);
    const targetIndex = ordered.findIndex((subtodo) => subtodo.id === targetId);
    if (targetIndex < 0) return todo;
    ordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, dragged);
    const orderById = new Map(ordered.map((subtodo, index) => [subtodo.id, index]));
    return {
      ...todo,
      subtodos: (todo.subtodos || []).map((subtodo) => ({
        ...subtodo,
        order: orderById.get(subtodo.id) ?? subtodo.order,
        updatedAt: subtodo.id === draggedId ? now : subtodo.updatedAt,
      })),
      updatedAt: now,
    };
  });
  state.trip.updatedAt = now;
  render();
}

export function toggleTodo(id, done) {
  state.trip.todos = (state.trip.todos || []).map((todo) =>
    todo.id === id ? updateParentTodoDone(todo, done) : todo,
  );
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function updateParentTodoDone(todo, done) {
  const hasIncompleteSubtodos = (todo.subtodos || []).some((subtodo) => !subtodo.done);
  if (done && hasIncompleteSubtodos) return todo;
  return {
    ...todo,
    done,
    updatedAt: new Date().toISOString(),
  };
}

export function deleteTodo(id) {
  state.trip.todos = (state.trip.todos || []).filter((todo) => todo.id !== id);
  state.expandedTodoIds = state.expandedTodoIds.filter((todoId) => todoId !== id);
  if (state.editingTodoId === id) state.editingTodoId = null;
  if (state.editingSubtodo?.parentId === id) state.editingSubtodo = null;
  state.trip.updatedAt = new Date().toISOString();
  render();
}
