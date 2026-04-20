const STORAGE_KEY = "trip-planner-v1";

const ITEM_TYPES = [
  "Flight",
  "Hotel",
  "Activity",
  "Family Visit",
  "Meal",
  "Transit",
  "Rest",
  "Reminder",
  "Custom",
];

const DEFAULT_ITEM_TYPE_COLORS = {
  Flight: "#b84a4a",
  Hotel: "#2563eb",
  Activity: "#2f6f73",
  "Family Visit": "#4d7c8a",
  Meal: "#7c3aed",
  Transit: "#b88a2d",
  Rest: "#16a34a",
  Reminder: "#2f6f73",
  Custom: "#2f6f73",
};

const STATUSES = ["Idea", "Planned", "Booked", "Confirmed", "Done", "Skipped"];

const CURRENCIES = ["USD", "RMB"];
const DEFAULT_USD_TO_RMB_RATE = 7.2;

const STATUS_ICONS = {
  Idea: {
    className: "idea",
    path: '<path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.74V16h8v-1.26A7 7 0 0 0 12 2Z" />',
  },
  Planned: {
    className: "planned",
    path: '<path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" />',
  },
  Booked: {
    className: "booked",
    path: '<path d="M2 9a3 3 0 0 0 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 0 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="m9 12 2 2 4-4" />',
  },
  Confirmed: {
    className: "confirmed",
    path: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" />',
  },
  Done: {
    className: "done",
    path: '<circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />',
  },
  Skipped: {
    className: "skipped",
    path: '<circle cx="12" cy="12" r="10" /><path d="m5 5 14 14" />',
  },
};

const DEFAULT_PEOPLE = ["Dad", "Mom", "Nora", "Freddie"];

const TIMEZONES = [
  { value: "US_EST", label: "US EST", shortLabel: "ET" },
  { value: "US_CDT", label: "US CDT", shortLabel: "CT" },
  { value: "BEIJING", label: "北京时间", shortLabel: "北京" },
];

const DEFAULT_TIMEZONE = "BEIJING";

const state = {
  store: loadStore(),
  trip: null,
  screen: "trips",
  view: "calendar",
  selectedDate: null,
  warningsExpanded: false,
  expandedTodoIds: [],
  editingTodoId: null,
  editingSubtodo: null,
  filters: {
    type: ["all"],
    status: ["all"],
    search: "",
  },
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  populateSelects();
  bindEvents();
  state.trip = getActiveTrip();
  state.selectedDate = state.trip?.startDate || null;
  render();
});

function cacheElements() {
  [
    "tripTitle",
    "tripsPage",
    "tripsList",
    "tripSettings",
    "workspace",
    "tripStart",
    "tripEnd",
    "tripTimezone",
    "allTripsButton",
    "newTripButton",
    "printCalendarButton",
    "exportButton",
    "importButton",
    "importInput",
    "addItemButton",
    "typeFilter",
    "statusFilter",
    "searchInput",
    "alerts",
    "calendarView",
    "listView",
    "dayView",
    "costsView",
    "controlsView",
    "sidePanel",
    "itemDialog",
    "itemForm",
    "dialogTitle",
    "dialogEyebrow",
    "closeDialogButton",
    "cancelItemButton",
    "deleteItemButton",
    "copyItemSection",
    "copyItemDate",
    "copyItemButton",
    "itemId",
    "itemTitle",
    "itemType",
    "itemStatus",
    "itemStartDate",
    "itemStartTime",
    "itemStartTbd",
    "itemStartTimeTbd",
    "itemStartTimezone",
    "itemEndDate",
    "itemEndTime",
    "itemEndTbd",
    "itemEndTimeTbd",
    "itemEndTimezone",
    "itemCity",
    "itemLocation",
    "genericCityField",
    "genericLocationField",
    "flightDepartureField",
    "flightArrivalField",
    "flightAirlineField",
    "itemDepartureCity",
    "itemArrivalCity",
    "itemAirline",
    "itemPeople",
    "itemConfirmation",
    "itemCost",
    "itemCurrency",
    "itemTags",
    "itemLinks",
    "itemNotes",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
  els.tabs = Array.from(document.querySelectorAll(".tab-button"));
  els.views = Array.from(document.querySelectorAll(".view-panel"));
  els.filterToggles = Array.from(document.querySelectorAll("[data-filter-toggle]"));
}

function populateSelects() {
  ITEM_TYPES.forEach((type) => {
    els.typeFilter.append(new Option(type, type));
    els.itemType.append(new Option(type, type));
  });
  STATUSES.forEach((status) => {
    els.statusFilter.append(new Option(status, status));
    els.itemStatus.append(new Option(status, status));
  });
  CURRENCIES.forEach((currency) => {
    els.itemCurrency.append(new Option(currency, currency));
  });
  populateTimezoneSelect(els.tripTimezone);
  populateTimezoneSelect(els.itemStartTimezone);
  populateTimezoneSelect(els.itemEndTimezone);
  populatePeopleSelect();
}

function populateTimezoneSelect(select) {
  TIMEZONES.forEach((timezone) => {
    select.append(new Option(timezone.label, timezone.value));
  });
}

function populatePeopleSelect(extraPeople = []) {
  const selectedPeople = new Set(getSelectedPeople());
  const people = [
    ...DEFAULT_PEOPLE,
    ...state.store.trips.flatMap((trip) => trip.items.flatMap((item) => item.people || [])),
    ...extraPeople,
  ];
  const uniquePeople = [...new Set(people.map((person) => String(person).trim()).filter(Boolean))];
  els.itemPeople.innerHTML = "";
  uniquePeople.forEach((person) => {
    const option = new Option(person, person);
    option.selected = selectedPeople.has(person);
    els.itemPeople.append(option);
  });
}

function getSelectedPeople() {
  if (!els.itemPeople) return [];
  return Array.from(els.itemPeople.selectedOptions || []).map((option) => option.value);
}

function getSelectedFilterValues(select) {
  const values = Array.from(select.selectedOptions || []).map((option) => option.value);
  const specificValues = values.filter((value) => value !== "all");
  return specificValues.length ? specificValues : ["all"];
}

function setSelectedFilterValues(select, values) {
  const selectedValues = normalizeFilterValues(values);
  Array.from(select.options).forEach((option) => {
    option.selected = selectedValues.includes(option.value);
  });
}

function normalizeFilterValues(values) {
  const list = Array.isArray(values) ? values : [values];
  const specificValues = list.filter((value) => value && value !== "all");
  return specificValues.length ? specificValues : ["all"];
}

function filterAllows(selectedValues, value) {
  const normalized = normalizeFilterValues(selectedValues);
  return normalized.includes("all") || normalized.includes(value);
}

function setSelectedPeople(people) {
  const selected = new Set(people);
  Array.from(els.itemPeople.options).forEach((option) => {
    option.selected = selected.has(option.value);
  });
}

function updateItemFormForType() {
  const isFlight = els.itemType.value === "Flight";
  els.genericCityField.hidden = isFlight;
  els.genericLocationField.hidden = isFlight;
  els.flightDepartureField.hidden = !isFlight;
  els.flightArrivalField.hidden = !isFlight;
  els.flightAirlineField.hidden = !isFlight;
}

function updateDateTimeTbdControls() {
  els.itemStartDate.disabled = els.itemStartTbd.checked;
  els.itemStartTime.disabled = els.itemStartTbd.checked || els.itemStartTimeTbd.checked;
  els.itemStartTimeTbd.disabled = els.itemStartTbd.checked;
  els.itemStartTimezone.disabled = els.itemStartTbd.checked;
  els.itemEndDate.disabled = els.itemEndTbd.checked;
  els.itemEndTime.disabled = els.itemEndTbd.checked || els.itemEndTimeTbd.checked;
  els.itemEndTimeTbd.disabled = els.itemEndTbd.checked;
  els.itemEndTimezone.disabled = els.itemEndTbd.checked;
  if (els.itemStartTbd.checked) {
    els.itemStartDate.value = "";
    els.itemStartTime.value = "";
    els.itemStartTimeTbd.checked = false;
  }
  if (els.itemStartTimeTbd.checked) els.itemStartTime.value = "";
  if (els.itemEndTbd.checked) {
    els.itemEndDate.value = "";
    els.itemEndTime.value = "";
    els.itemEndTimeTbd.checked = false;
  }
  if (els.itemEndTimeTbd.checked) els.itemEndTime.value = "";
}

function bindEvents() {
  els.tripTitle.addEventListener("input", updateTripSettings);
  els.tripStart.addEventListener("change", updateTripSettings);
  els.tripEnd.addEventListener("change", updateTripSettings);
  els.tripTimezone.addEventListener("change", updateTripSettings);
  els.itemType.addEventListener("change", updateItemFormForType);
  els.itemStartTbd.addEventListener("change", updateDateTimeTbdControls);
  els.itemStartTimeTbd.addEventListener("change", updateDateTimeTbdControls);
  els.itemEndTbd.addEventListener("change", updateDateTimeTbdControls);
  els.itemEndTimeTbd.addEventListener("change", updateDateTimeTbdControls);
  els.allTripsButton.addEventListener("click", () => {
    state.screen = "trips";
    render();
  });
  els.newTripButton.addEventListener("click", createNewTrip);

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.view = tab.dataset.view;
      render();
    });
  });

  els.filterToggles.forEach((button) => {
    button.addEventListener("click", () => toggleFilterSelect(button));
  });

  els.typeFilter.addEventListener("change", () => {
    state.filters.type = getSelectedFilterValues(els.typeFilter);
    setSelectedFilterValues(els.typeFilter, state.filters.type);
    render();
  });
  els.statusFilter.addEventListener("change", () => {
    state.filters.status = getSelectedFilterValues(els.statusFilter);
    setSelectedFilterValues(els.statusFilter, state.filters.status);
    render();
  });
  els.searchInput.addEventListener("input", () => {
    state.filters.search = els.searchInput.value.trim().toLowerCase();
    render();
  });

  els.addItemButton.addEventListener("click", () => openItemDialog());
  els.itemForm.addEventListener("submit", saveItemFromForm);
  els.closeDialogButton.addEventListener("click", closeItemDialog);
  els.cancelItemButton.addEventListener("click", closeItemDialog);
  els.deleteItemButton.addEventListener("click", deleteCurrentItem);
  els.copyItemButton.addEventListener("click", copyCurrentItemToDate);
  els.printCalendarButton.addEventListener("click", printCalendar);
  els.exportButton.addEventListener("click", exportTrip);
  els.importInput.addEventListener("change", importTrip);
}

function toggleFilterSelect(button) {
  const field = button.closest(".filter-select-field");
  const select = document.getElementById(button.getAttribute("aria-controls"));
  if (!field || !select) return;
  const expanded = !field.classList.contains("expanded");
  field.classList.toggle("expanded", expanded);
  button.setAttribute("aria-expanded", String(expanded));
  button.textContent = expanded ? "Collapse" : "Expand";
  if (expanded) select.focus({ preventScroll: true });
}

function loadStore() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.trips)) return normalizeStore(parsed);
      const migratedTrip = normalizeTrip(parsed);
      return {
        version: 2,
        activeTripId: migratedTrip.id,
        trips: [migratedTrip],
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  const sampleTrip = createSampleTrip();
  return {
    version: 2,
    activeTripId: sampleTrip.id,
    trips: [sampleTrip],
  };
}

function normalizeStore(store) {
  const trips = Array.isArray(store.trips) ? store.trips.map(normalizeTrip) : [];
  if (!trips.length) trips.push(createSampleTrip());
  const activeTripId = trips.some((trip) => trip.id === store.activeTripId) ? store.activeTripId : trips[0].id;
  return {
    version: 2,
    activeTripId,
    trips,
  };
}

function getActiveTrip() {
  if (!state.store.trips.length) {
    const sampleTrip = createSampleTrip();
    state.store.trips.push(sampleTrip);
    state.store.activeTripId = sampleTrip.id;
  }
  return state.store.trips.find((trip) => trip.id === state.store.activeTripId) || state.store.trips[0];
}

function normalizeTrip(trip) {
  return {
    id: trip.id || createId(),
    title: trip.title || "Japan Family Trip",
    startDate: trip.startDate || "2026-05-12",
    endDate: trip.endDate || "2026-05-19",
    homeTimezone: normalizeTimezone(trip.homeTimezone),
    itemTypeColors: normalizeItemTypeColors(trip.itemTypeColors),
    costSettings: normalizeCostSettings(trip.costSettings),
    notes: trip.notes || "",
    items: Array.isArray(trip.items) ? trip.items.map(normalizeItem) : [],
    todos: Array.isArray(trip.todos) ? trip.todos.map((todo, index) => normalizeTodo(todo, index)).filter((todo) => todo.text) : [],
  };
}

function normalizeTodo(todo, fallbackOrder = 0) {
  const order = Number(todo.order);
  const subtodos = Array.isArray(todo.subtodos)
    ? todo.subtodos.map((subtodo, index) => normalizeSubtodo(subtodo, index)).filter((subtodo) => subtodo.text)
    : [];
  return {
    id: todo.id || createId(),
    text: String(todo.text || "").trim(),
    done: subtodos.some((subtodo) => !subtodo.done) ? false : Boolean(todo.done),
    order: Number.isFinite(order) ? order : fallbackOrder,
    cost: normalizeCostValue(todo.cost),
    currency: normalizeCurrency(todo.currency),
    subtodos,
    createdAt: todo.createdAt || new Date().toISOString(),
    updatedAt: todo.updatedAt || new Date().toISOString(),
  };
}

function normalizeSubtodo(subtodo, fallbackOrder = 0) {
  const order = Number(subtodo.order);
  return {
    id: subtodo.id || createId(),
    text: String(subtodo.text || "").trim(),
    done: Boolean(subtodo.done),
    order: Number.isFinite(order) ? order : fallbackOrder,
    cost: normalizeCostValue(subtodo.cost),
    currency: normalizeCurrency(subtodo.currency),
    createdAt: subtodo.createdAt || new Date().toISOString(),
    updatedAt: subtodo.updatedAt || new Date().toISOString(),
  };
}

function normalizeItemTypeColors(colors = {}) {
  const source = colors && typeof colors === "object" ? colors : {};
  return ITEM_TYPES.reduce((normalized, type) => {
    normalized[type] = normalizeHexColor(source[type]) || getDefaultItemTypeColor(type);
    return normalized;
  }, {});
}

function normalizeHexColor(value) {
  const color = String(value || "").trim();
  const shortMatch = color.match(/^#?([0-9a-f]{3})$/i);
  if (shortMatch) {
    return `#${shortMatch[1]
      .split("")
      .map((part) => part + part)
      .join("")}`.toLowerCase();
  }
  const longMatch = color.match(/^#?([0-9a-f]{6})$/i);
  if (longMatch) return `#${longMatch[1]}`.toLowerCase();
  return "";
}

function getDefaultItemTypeColor(type) {
  return DEFAULT_ITEM_TYPE_COLORS[type] || DEFAULT_ITEM_TYPE_COLORS.Custom;
}

function getItemTypeColor(type) {
  return normalizeHexColor(state.trip?.itemTypeColors?.[type]) || getDefaultItemTypeColor(type);
}

function renderItemTypeStyle(type) {
  return `style="--item-type-color: ${escapeHtml(getItemTypeColor(type))};"`;
}

function normalizeItem(item) {
  return {
    id: item.id || createId(),
    type: ITEM_TYPES.includes(item.type) ? item.type : "Custom",
    title: item.title || "Untitled item",
    startTbd: Boolean(item.startTbd),
    endTbd: Boolean(item.endTbd),
    startTimeTbd: Boolean(item.startTimeTbd),
    endTimeTbd: Boolean(item.endTimeTbd),
    startDateTime: item.startTbd ? "" : item.startDateTime || "",
    endDateTime: item.endTbd ? "" : item.endDateTime || "",
    allDay: Boolean(item.allDay),
    startTimezone: normalizeTimezone(item.startTimezone || item.timezone),
    endTimezone: normalizeTimezone(item.endTimezone || item.timezone || item.startTimezone),
    timezone: normalizeTimezone(item.timezone || item.startTimezone),
    departureCity: item.departureCity || "",
    arrivalCity: item.arrivalCity || (item.type === "Flight" ? item.city || "" : ""),
    airline: item.airline || "",
    city: item.type === "Flight" ? item.arrivalCity || item.city || "" : item.city || "",
    location: item.type === "Flight" ? "" : item.location || "",
    status: STATUSES.includes(item.status) ? item.status : "Idea",
    priority: item.priority || "Should Do",
    notes: item.notes || "",
    links: Array.isArray(item.links) ? item.links : item.links ? [item.links] : [],
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
    confirmationCode: item.confirmationCode || "",
    cost: item.cost || "",
    currency: normalizeCurrency(item.currency),
    people: Array.isArray(item.people) ? item.people : splitList(item.people),
    tags: Array.isArray(item.tags) ? item.tags : splitList(item.tags),
    source: item.source || "manual",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

function createSampleTrip() {
  return {
    id: createId(),
    title: "Japan Family Trip",
    startDate: "2026-05-12",
    endDate: "2026-05-19",
    homeTimezone: DEFAULT_TIMEZONE,
    itemTypeColors: normalizeItemTypeColors(),
    costSettings: normalizeCostSettings(),
    notes: "",
    todos: [],
    items: [
      normalizeItem({
        type: "Flight",
        title: "SFO to Tokyo",
        startDateTime: "2026-05-12T09:30",
        endDateTime: "2026-05-13T14:20",
        departureCity: "San Francisco",
        arrivalCity: "Tokyo",
        airline: "Japan Airlines",
        status: "Booked",
        confirmationCode: "JL001",
        people: ["Alex"],
      }),
      sampleItem("Hotel", "Check in at Ginza stay", "2026-05-13T16:00", "2026-05-16T10:00", "Tokyo", "Ginza", "Confirmed", "HTL-4821", []),
      sampleItem("Meal", "Dinner with auntie", "2026-05-13T19:00", "2026-05-13T21:00", "Tokyo", "Shinjuku", "Planned", "", ["Auntie", "Mom"]),
      sampleItem("Activity", "TeamLab reservation", "2026-05-14T10:30", "2026-05-14T12:30", "Tokyo", "Toyosu", "Idea", "", []),
      sampleItem("Family Visit", "Visit cousin", "2026-05-14T18:00", "2026-05-14T21:30", "Tokyo", "Meguro", "Planned", "", ["Cousin"]),
      sampleItem("Transit", "Shinkansen to Kyoto", "2026-05-16T11:30", "2026-05-16T14:00", "Kyoto", "Tokyo Station to Kyoto Station", "Booked", "JR-912", []),
      sampleItem("Hotel", "Kyoto ryokan", "2026-05-16T15:30", "2026-05-19T10:00", "Kyoto", "Gion", "Confirmed", "RYK-1190", []),
      sampleItem("Activity", "Fushimi Inari early walk", "2026-05-17T08:00", "2026-05-17T10:30", "Kyoto", "Fushimi Inari", "Planned", "", []),
      sampleItem("Rest", "Slow morning", "2026-05-18T09:00", "2026-05-18T10:30", "Kyoto", "Ryokan", "Planned", "", []),
      sampleItem("Reminder", "Buy gifts for family", "2026-05-18T15:00", "2026-05-18T16:00", "Kyoto", "Nishiki Market", "Idea", "", []),
    ],
  };
}

function sampleItem(type, title, start, end, city, location, status, confirmationCode, people) {
  return normalizeItem({
    type,
    title,
    startDateTime: start,
    endDateTime: end,
    city,
    location,
    status,
    confirmationCode,
    people,
    tags: [],
    notes: "",
  });
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store));
}

function render() {
  state.trip = getActiveTrip();
  if (!state.selectedDate && state.trip) state.selectedDate = state.trip.startDate;
  renderScreens();
  renderTripsList();
  if (state.trip) {
    renderTripSettings();
    renderTabs();
    renderAlerts();
    renderCalendar();
    renderList();
    renderDayView();
    renderCosts();
    renderControls();
    renderSidePanel();
  }
  saveStore();
}

function renderScreens() {
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

function renderTripsList() {
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

function openTrip(id) {
  state.store.activeTripId = id;
  state.trip = getActiveTrip();
  state.selectedDate = state.trip.startDate;
  state.view = "calendar";
  state.screen = "workspace";
  state.filters = { type: ["all"], status: ["all"], search: "" };
  render();
}

function createNewTrip() {
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

function resetTrip(id) {
  const trip = state.store.trips.find((entry) => entry.id === id);
  if (!trip) return;
  const confirmation = window.prompt(
    `Reset "${trip.title}"?\n\nThis will permanently clear all itinerary items, checklist todos, and trip notes. The trip shell and dates will stay, but the removed data cannot be recovered.\n\nType RESET to continue.`,
  );
  if (confirmation !== "RESET") return;
  trip.items = [];
  trip.todos = [];
  trip.notes = "";
  trip.updatedAt = new Date().toISOString();
  if (state.store.activeTripId === id) {
    state.trip = trip;
    state.selectedDate = trip.startDate;
  }
  render();
}

function deleteTrip(id) {
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

function renderTripSettings() {
  els.tripTitle.value = state.trip.title;
  els.tripStart.value = state.trip.startDate;
  els.tripEnd.value = state.trip.endDate;
  els.tripTimezone.value = normalizeTimezone(state.trip.homeTimezone);
  state.filters.type = normalizeFilterValues(state.filters.type);
  state.filters.status = normalizeFilterValues(state.filters.status);
  setSelectedFilterValues(els.typeFilter, state.filters.type);
  setSelectedFilterValues(els.statusFilter, state.filters.status);
  els.searchInput.value = state.filters.search;
}

function renderTabs() {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === state.view));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${state.view}View`));
}

function renderAlerts() {
  els.alerts.hidden = true;
  els.alerts.innerHTML = "";
}

function renderCalendar() {
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
          <button class="item-pill" ${renderItemTypeStyle(item.type)} data-action="edit" data-id="${item.id}" data-type="${escapeHtml(item.type)}" type="button">
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
  `;
  bindDynamicActions(els.calendarView);
  bindCalendarDayCells();
}

function renderList() {
  const rows = eachTripDate()
    .map((date) => {
      const items = getItemsForDate(date);
      const showTimezone = shouldShowTimezoneForItems(items);
      return `
        <section class="section-block ${date === state.selectedDate ? "selected-section" : ""}">
          <div class="section-header">
            <button class="list-day-button" data-action="select-day" data-date="${date}" type="button">
              ${escapeHtml(formatDateLong(date))}
            </button>
            <span class="muted">${items.length} item${items.length === 1 ? "" : "s"}</span>
          </div>
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

function renderDayView() {
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

function renderCosts() {
  const travelCosts = getTravelCostEntries();
  const todoCosts = getTodoCostEntries();
  const allCosts = [...travelCosts, ...todoCosts];
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
      <div class="cost-summary-grid">
        ${renderCostSummaryCard("Total tracked", allCosts, costSettings, "total")}
        ${renderCostSummaryCard("Travel plans", travelCosts, costSettings, "travel")}
        ${renderCostSummaryCard("Checklist todos", todoCosts, costSettings, "todo")}
      </div>
      <div class="cost-breakdown-grid">
        ${renderCostBreakdown("Travel costs", travelCosts, "Costs entered on calendar and day detail itinerary items.", costSettings, "travel")}
        ${renderCostBreakdown("Checklist costs", todoCosts, "Costs entered on planning todos and sub todos.", costSettings, "todo")}
      </div>
    </section>
  `;
  bindCostControls();
}

function renderCostSummaryCard(title, entries, costSettings, variant = "") {
  const totals = formatCostTotals(entries, costSettings);
  return `
    <article class="cost-summary-card ${variant ? `cost-summary-${variant}` : ""}">
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(totals || "No costs yet")}</strong>
      <small>${entries.length} entr${entries.length === 1 ? "y" : "ies"}</small>
    </article>
  `;
}

function renderCostBreakdown(title, entries, description, costSettings, variant = "") {
  return `
    <section class="cost-breakdown ${variant ? `cost-breakdown-${variant}` : ""}">
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

function renderCostEntry(entry, costSettings) {
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

function bindCostControls() {
  const currencySelect = els.costsView.querySelector("#costDisplayCurrency");
  const rateInput = els.costsView.querySelector("#usdToRmbRate");
  currencySelect?.addEventListener("change", updateCostSettingsFromControls);
  rateInput?.addEventListener("change", updateCostSettingsFromControls);
}

function updateCostSettingsFromControls() {
  const currencySelect = els.costsView.querySelector("#costDisplayCurrency");
  const rateInput = els.costsView.querySelector("#usdToRmbRate");
  state.trip.costSettings = normalizeCostSettings({
    displayCurrency: currencySelect?.value,
    usdToRmbRate: rateInput?.value,
  });
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function renderControls() {
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
}

function updateItemTypeColorFromCode(input, options = {}) {
  const color = normalizeHexColor(input.value);
  input.setCustomValidity(color ? "" : "Use a hex color like #FD151B.");
  if (!color) {
    if (options.renderControls !== false) input.reportValidity();
    return;
  }
  updateItemTypeColor(input.dataset.colorCodeType, color, options);
}

function updateItemTypeColor(type, value, options = {}) {
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

function resetItemTypeColors() {
  state.trip.itemTypeColors = normalizeItemTypeColors();
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function applyItemTypeColorToRenderedItems(type, color) {
  document.querySelectorAll(".item-pill[data-type], .timeline-card[data-type]").forEach((element) => {
    if (element.dataset.type === type) element.style.setProperty("--item-type-color", color);
  });
}

function updateColorControlReadout(type, color) {
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

function renderSidePanel() {
  const date = state.selectedDate || state.trip.startDate;
  const items = getItemsForDate(date);
  const todos = getTripTodos();
  const completedTodos = todos.filter((todo) => todo.done).length;
  const showTimezone = shouldShowTimezoneForItems(items);
  const city = getPrimaryCity(date);
  const allWarnings = getWarnings();
  const warnings = allWarnings.filter((warning) => warning.date === date);
  els.sidePanel.innerHTML = `
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
    <section class="todo-panel" aria-label="Planning todos">
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
        </div>
      </form>
      <div class="todo-list">
        ${
          todos.length
            ? todos.map(renderTodoItem).join("")
            : `<div class="empty-state compact">No todos yet.</div>`
        }
      </div>
    </section>
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
  bindTodoActions(els.sidePanel);
  bindWarningsPanel(els.sidePanel);
}

function renderWarningItem(warning) {
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

function renderTodoItem(todo) {
  const subtodos = getSubtodos(todo);
  const isExpanded = isTodoExpanded(todo.id);
  const isEditing = state.editingTodoId === todo.id;
  const hasIncompleteSubtodos = subtodos.some((subtodo) => !subtodo.done);
  const canCheckParent = !subtodos.length || !hasIncompleteSubtodos;
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

function renderSubtodoItem(parentId, subtodo) {
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
      ${!isEditing && subtodo.cost ? `<span class="todo-cost-badge">${escapeHtml(formatCostAmount(subtodo.cost, subtodo.currency))}</span>` : ""}
      ${!isEditing ? `<button class="icon-button todo-delete-button" data-subtodo-action="delete" data-parent-id="${parentId}" data-id="${subtodo.id}" type="button" aria-label="Delete sub todo">x</button>` : ""}
    </div>
  `;
}

function renderTodoEditForm(todo) {
  return `
    <form class="todo-edit-form" data-todo-edit-form data-id="${todo.id}">
      <input name="todoText" type="text" value="${escapeHtml(todo.text)}" aria-label="Edit todo text" />
      <div class="todo-cost-row">
        <input name="todoCost" type="number" min="0" step="0.01" value="${escapeHtml(todo.cost || "")}" placeholder="Cost" aria-label="Todo cost" />
        <select name="todoCurrency" aria-label="Todo cost currency">${renderCurrencyOptions(todo.currency)}</select>
      </div>
      <span class="todo-edit-actions">
        <button class="secondary-button compact-button" type="submit">Save</button>
        <button class="secondary-button compact-button" data-todo-action="cancel-edit" type="button">Cancel</button>
      </span>
    </form>
  `;
}

function renderSubtodoEditForm(parentId, subtodo) {
  return `
    <form class="todo-edit-form" data-subtodo-edit-form data-parent-id="${parentId}" data-id="${subtodo.id}">
      <input name="subtodoText" type="text" value="${escapeHtml(subtodo.text)}" aria-label="Edit sub todo text" />
      <div class="todo-cost-row">
        <input name="subtodoCost" type="number" min="0" step="0.01" value="${escapeHtml(subtodo.cost || "")}" placeholder="Cost" aria-label="Sub todo cost" />
        <select name="subtodoCurrency" aria-label="Sub todo cost currency">${renderCurrencyOptions(subtodo.currency)}</select>
      </div>
      <span class="todo-edit-actions">
        <button class="secondary-button compact-button" type="submit">Save</button>
        <button class="secondary-button compact-button" data-subtodo-action="cancel-edit" type="button">Cancel</button>
      </span>
    </form>
  `;
}

function renderCurrencyOptions(selected = "USD") {
  const normalized = normalizeCurrency(selected);
  return CURRENCIES.map((currency) => `<option value="${currency}" ${currency === normalized ? "selected" : ""}>${currency}</option>`).join("");
}

function renderTimelineRow(item, options = {}) {
  const isWarning = getWarnings().some((warning) => warning.itemIds?.includes(item.id));
  return `
    <div class="timeline-row">
      <div class="timeline-time">${escapeHtml(formatItemTime(item, options))}</div>
      <button class="timeline-card ${isWarning ? "warning-border" : ""}" ${renderItemTypeStyle(item.type)} data-action="edit" data-id="${item.id}" data-type="${escapeHtml(item.type)}" type="button">
        ${renderStatusIcon(item.status)}
        <strong>${escapeHtml(item.title)}</strong>
        <span class="item-meta">${escapeHtml(getItemMeta(item))}</span>
        <span class="status-line">
          <span class="badge ${escapeHtml(item.status.toLowerCase())}">${escapeHtml(item.status)}</span>
          ${item.airline ? `<span class="badge">${escapeHtml(item.airline)}</span>` : ""}
          ${item.confirmationCode ? `<span class="badge">${escapeHtml(item.confirmationCode)}</span>` : ""}
          ${item.cost ? `<span class="badge">${escapeHtml(formatCost(item))}</span>` : ""}
          ${item.people.length ? `<span class="badge">${escapeHtml(item.people.join(", "))}</span>` : ""}
        </span>
      </button>
    </div>
  `;
}

function renderStatusIcon(status) {
  const icon = STATUS_ICONS[status] || STATUS_ICONS.Idea;
  const label = status || "Idea";
  return `
    <span class="status-icon ${icon.className}" role="img" aria-label="${escapeHtml(`Status: ${label}`)}" title="${escapeHtml(label)}">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon.path}</svg>
    </span>
  `;
}

function getItemMeta(item) {
  if (item.type === "Flight") {
    const route = [item.departureCity, item.arrivalCity].filter(Boolean).join(" to ");
    return ["Flight", item.airline, route].filter(Boolean).join(" - ");
  }
  return [item.type, item.city, item.location].filter(Boolean).join(" - ");
}

function bindDynamicActions(container) {
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
        state.view = "day";
        render();
      }
    });
  });
}

function bindTodoActions(container) {
  const form = container.querySelector("[data-todo-form]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.elements.todoText;
    addTodo(input.value, form.elements.todoCost.value, form.elements.todoCurrency.value);
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
      updateTodoText(form.dataset.id, form.elements.todoText.value, form.elements.todoCost.value, form.elements.todoCurrency.value);
    });
  });

  container.querySelectorAll("[data-todo-action='expand']").forEach((button) => {
    button.addEventListener("click", () => toggleTodoExpanded(button.dataset.id));
  });

  container.querySelectorAll("[data-subtodo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addSubtodo(form.dataset.parentId, form.elements.subtodoText.value, form.elements.subtodoCost.value, form.elements.subtodoCurrency.value);
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
      updateSubtodoText(form.dataset.parentId, form.dataset.id, form.elements.subtodoText.value, form.elements.subtodoCost.value, form.elements.subtodoCurrency.value);
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

function getTodoDropPosition(event, item) {
  const rect = item.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function isTodoExpanded(id) {
  return state.expandedTodoIds.includes(id);
}

function toggleTodoExpanded(id, expanded = !isTodoExpanded(id)) {
  state.expandedTodoIds = expanded
    ? [...new Set([...state.expandedTodoIds, id])]
    : state.expandedTodoIds.filter((todoId) => todoId !== id);
  render();
}

function startTodoEdit(id) {
  state.editingTodoId = id;
  state.editingSubtodo = null;
  render();
}

function startSubtodoEdit(parentId, id) {
  state.editingTodoId = null;
  state.editingSubtodo = { parentId, id };
  render();
}

function cancelTodoEdit() {
  state.editingTodoId = null;
  state.editingSubtodo = null;
  render();
}

function bindWarningsPanel(container) {
  const details = container.querySelector(".warnings-panel");
  details?.addEventListener("toggle", () => {
    state.warningsExpanded = details.open;
  });
}

function bindCalendarDayCells() {
  els.calendarView.querySelectorAll(".day-cell[data-date]").forEach((cell) => {
    cell.addEventListener("click", (event) => {
      if (event.target.closest("[data-action='edit']")) return;
      state.selectedDate = cell.dataset.date;
      render();
    });
  });
}

function updateTripSettings() {
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

function openItemDialog(id = null, date = null) {
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

function closeItemDialog() {
  els.itemDialog.close();
}

function saveItemFromForm(event) {
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

function deleteCurrentItem() {
  const id = els.itemId.value;
  if (!id) return;
  state.trip.items = state.trip.items.filter((item) => item.id !== id);
  closeItemDialog();
  render();
}

function copyCurrentItemToDate() {
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

function printCalendar() {
  state.view = "calendar";
  render();
  requestAnimationFrame(() => window.print());
}

function exportTrip() {
  const blob = new Blob([JSON.stringify(state.trip, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(state.trip.title) || "trip"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importTrip(event) {
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

function getUniqueTripTitle(title) {
  const existingTitles = new Set(state.store.trips.map((trip) => trip.title));
  if (!existingTitles.has(title)) return title;
  let index = 2;
  while (existingTitles.has(`${title} ${index}`)) index += 1;
  return `${title} ${index}`;
}

function getCalendarDates() {
  const tripDates = eachTripDate();
  const first = parseLocalDate(tripDates[0]);
  const last = parseLocalDate(tripDates[tripDates.length - 1]);
  first.setDate(first.getDate() - first.getDay());
  last.setDate(last.getDate() + (6 - last.getDay()));

  const dates = [];
  for (const cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
    const iso = toIsoDate(cursor);
    dates.push({
      iso,
      dayNumber: cursor.getDate(),
      inRange: iso >= state.trip.startDate && iso <= state.trip.endDate,
    });
  }
  return dates;
}

function eachTripDate() {
  const dates = [];
  const start = parseLocalDate(state.trip.startDate);
  const end = parseLocalDate(state.trip.endDate);
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toIsoDate(cursor));
  }
  return dates;
}

function getItemsForDate(date) {
  return filteredItems()
    .filter((item) => itemOccursOnDate(item, date))
    .sort(compareItems);
}

function getTripTodos() {
  return (state.trip.todos || [])
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

function getSubtodos(todo) {
  return (todo.subtodos || [])
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

function getTravelCostEntries() {
  return state.trip.items
    .filter((item) => hasCost(item.cost))
    .sort(compareItems)
    .map((item) => ({
      title: item.title,
      meta: [item.type, getDatePart(item.startDateTime) ? formatDateShort(getDatePart(item.startDateTime)) : "Unscheduled", item.city].filter(Boolean).join(" - "),
      cost: item.cost,
      currency: normalizeCurrency(item.currency),
      source: "travel",
    }));
}

function getTodoCostEntries() {
  return getTripTodos().flatMap((todo) => {
    const entries = [];
    if (hasCost(todo.cost)) {
      entries.push({
        title: todo.text,
        meta: "Checklist todo",
        cost: todo.cost,
        currency: normalizeCurrency(todo.currency),
        source: "todo",
      });
    }
    getSubtodos(todo).forEach((subtodo) => {
      if (!hasCost(subtodo.cost)) return;
      entries.push({
        title: subtodo.text,
        meta: `Sub todo - ${todo.text}`,
        cost: subtodo.cost,
        currency: normalizeCurrency(subtodo.currency),
        source: "subtodo",
      });
    });
    return entries;
  });
}

function formatCostTotals(entries, costSettings = getCostSettings()) {
  if (!entries.length) return "";
  const total = entries.reduce((sum, entry) => {
    return sum + convertCost(entry.cost, entry.currency, costSettings.displayCurrency, costSettings);
  }, 0);
  return formatCostAmount(total, costSettings.displayCurrency);
}

function hasCost(value) {
  return normalizeCostValue(value) !== "";
}

function getCostSettings() {
  state.trip.costSettings = normalizeCostSettings(state.trip.costSettings);
  return state.trip.costSettings;
}

function convertCost(cost, fromCurrency, toCurrency, costSettings = getCostSettings()) {
  const amount = Number(cost || 0);
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return amount;
  if (from === "USD" && to === "RMB") return amount * costSettings.usdToRmbRate;
  if (from === "RMB" && to === "USD") return amount / costSettings.usdToRmbRate;
  return amount;
}

function addTodo(text, cost = "", currency = "USD") {
  const normalized = normalizeTodo({ text, cost, currency, order: getNextTodoOrder() });
  if (!normalized.text) return;
  state.trip.todos = [...(state.trip.todos || []), normalized];
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function getNextTodoOrder() {
  return Math.max(-1, ...(state.trip.todos || []).map((todo) => Number(todo.order) || 0)) + 1;
}

function getNextSubtodoOrder(parent) {
  return Math.max(-1, ...(parent.subtodos || []).map((subtodo) => Number(subtodo.order) || 0)) + 1;
}

function reorderTodo(draggedId, targetId, position = "before") {
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

function updateTodoText(id, text, cost = "", currency = "USD") {
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
          updatedAt: now,
        }
      : todo,
  );
  state.editingTodoId = null;
  state.trip.updatedAt = now;
  render();
}

function addSubtodo(parentId, text, cost = "", currency = "USD") {
  const now = new Date().toISOString();
  state.trip.todos = (state.trip.todos || []).map((todo) => {
    if (todo.id !== parentId) return todo;
    const subtodo = normalizeSubtodo({ text, cost, currency, order: getNextSubtodoOrder(todo) });
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

function toggleSubtodo(parentId, id, done) {
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

function deleteSubtodo(parentId, id) {
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

function updateSubtodoText(parentId, id, text, cost = "", currency = "USD") {
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

function reorderSubtodo(parentId, draggedId, targetId, position = "before") {
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

function toggleTodo(id, done) {
  state.trip.todos = (state.trip.todos || []).map((todo) =>
    todo.id === id ? updateParentTodoDone(todo, done) : todo,
  );
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function updateParentTodoDone(todo, done) {
  const hasIncompleteSubtodos = (todo.subtodos || []).some((subtodo) => !subtodo.done);
  if (done && hasIncompleteSubtodos) return todo;
  return {
    ...todo,
    done,
    updatedAt: new Date().toISOString(),
  };
}

function deleteTodo(id) {
  state.trip.todos = (state.trip.todos || []).filter((todo) => todo.id !== id);
  state.expandedTodoIds = state.expandedTodoIds.filter((todoId) => todoId !== id);
  if (state.editingTodoId === id) state.editingTodoId = null;
  if (state.editingSubtodo?.parentId === id) state.editingSubtodo = null;
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function shouldShowTimezoneForItems(items) {
  const timezones = new Set(items.flatMap(getDisplayTimezones));
  return timezones.size > 1;
}

function getDisplayTimezones(item) {
  if (!item.startDateTime && !item.endDateTime) return [];
  const timezones = [];
  if (!item.startTbd && item.startDateTime) {
    timezones.push(normalizeTimezone(item.startTimezone || item.timezone));
  }
  if (!item.endTbd && item.endDateTime) {
    timezones.push(normalizeTimezone(item.endTimezone || item.timezone || item.startTimezone));
  }
  return timezones;
}

function getTbdItems() {
  return filteredItems()
    .filter((item) => item.startTbd || !item.startDateTime)
    .sort(compareItems);
}

function filteredItems() {
  return state.trip.items.filter((item) => {
    const typeMatch = filterAllows(state.filters.type, item.type);
    const statusMatch = filterAllows(state.filters.status, item.status);
    const haystack = [
      item.title,
      item.city,
      item.location,
      item.status,
      item.type,
      item.notes,
      item.confirmationCode,
      item.departureCity,
      item.arrivalCity,
      item.airline,
      ...item.people,
      ...item.tags,
    ]
      .join(" ")
      .toLowerCase();
    const searchMatch = !state.filters.search || haystack.includes(state.filters.search);
    return typeMatch && statusMatch && searchMatch;
  });
}

function itemOccursOnDate(item, date) {
  const startDate = getDatePart(item.startDateTime);
  const endDate = getDatePart(item.endDateTime) || startDate;
  if (!startDate) return false;
  return date >= startDate && date <= endDate;
}

function compareItems(a, b) {
  return getSortDateTime(a).localeCompare(getSortDateTime(b)) || a.title.localeCompare(b.title);
}

function getSortDateTime(item) {
  if (!item.startDateTime) return "";
  const date = getDatePart(item.startDateTime);
  if (item.startTimeTbd) return `${date}T99:99`;
  return item.startDateTime;
}

function getPrimaryCity(date) {
  const cityCounts = new Map();
  state.trip.items
    .filter((item) => itemOccursOnDate(item, date) && item.city)
    .forEach((item) => cityCounts.set(item.city, (cityCounts.get(item.city) || 0) + 1));
  return [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function getTripCities(trip) {
  return [...new Set(trip.items.map((item) => item.city).filter(Boolean))].slice(0, 3).join(", ");
}

function getWarningsForTrip(trip) {
  const previousTrip = state.trip;
  state.trip = trip;
  const warnings = getWarnings();
  state.trip = previousTrip;
  return warnings;
}

function getWarnings() {
  return [
    ...getTbdDateTimeWarnings(),
    ...getOverlapWarnings(),
    ...getMissingLocationWarnings(),
    ...getTightTransitionWarnings(),
    ...getLodgingWarnings(),
  ];
}

function getTbdDateTimeWarnings() {
  return state.trip.items
    .filter((item) => item.startTbd || item.endTbd || item.startTimeTbd || item.endTimeTbd)
    .map((item) => {
      const missing = [
        item.startTbd ? "start date/time" : "",
        item.startTimeTbd ? "start time" : "",
        item.endTbd ? "end date/time" : "",
        item.endTimeTbd ? "end time" : "",
      ]
        .filter(Boolean)
        .join(" and ");
      return {
        type: "TBD time",
        date: getDatePart(item.startDateTime || item.endDateTime),
        itemIds: [item.id],
        message: `${item.title} has ${missing} marked TBD.`,
      };
    });
}

function getOverlapWarnings() {
  const warnings = [];
  eachTripDate().forEach((date) => {
    const timed = state.trip.items
      .filter((item) => item.type !== "Hotel" && itemOccursOnDate(item, date) && item.startDateTime && item.endDateTime && !item.startTimeTbd && !item.endTimeTbd)
      .sort(compareItems);
    timed.forEach((item, index) => {
      const next = timed[index + 1];
      if (!next) return;
      if (new Date(item.endDateTime) > new Date(next.startDateTime)) {
        warnings.push({
          type: "Overlap",
          date,
          itemIds: [item.id, next.id],
          message: `${item.title} overlaps with ${next.title} on ${formatDateShort(date)}.`,
        });
      }
    });
  });
  return warnings;
}

function getMissingLocationWarnings() {
  return state.trip.items
    .filter((item) => ["Hotel", "Activity", "Family Visit", "Meal"].includes(item.type) && !item.location)
    .map((item) => ({
      type: "Missing location",
      date: getDatePart(item.startDateTime),
      itemIds: [item.id],
      message: `${item.title} needs a location before the trip.`,
    }));
}

function getTightTransitionWarnings() {
  const warnings = [];
  eachTripDate().forEach((date) => {
    const timed = state.trip.items
      .filter((item) => item.type !== "Hotel" && itemOccursOnDate(item, date) && item.startDateTime && item.endDateTime && !item.startTimeTbd && !item.endTimeTbd)
      .sort(compareItems);
    timed.forEach((item, index) => {
      const next = timed[index + 1];
      if (!next) return;
      const gapMinutes = (new Date(next.startDateTime) - new Date(item.endDateTime)) / 60000;
      const differentPlace = item.location && next.location && item.location !== next.location;
      if (gapMinutes >= 0 && gapMinutes < 45 && differentPlace) {
        warnings.push({
          type: "Tight transition",
          date,
          itemIds: [item.id, next.id],
          message: `${Math.round(gapMinutes)} minutes between ${item.title} and ${next.title}.`,
        });
      }
    });
  });
  return warnings;
}

function getLodgingWarnings() {
  return eachTripDate()
    .slice(0, -1)
    .filter((date) => {
      return !state.trip.items.some((item) => {
        if (item.type !== "Hotel") return false;
        const start = getDatePart(item.startDateTime);
        const end = getDatePart(item.endDateTime);
        return start && end && date >= start && date < end;
      });
    })
    .map((date) => ({
      type: "Lodging gap",
      date,
      message: `No hotel or lodging block covers the night of ${formatDateShort(date)}.`,
    }));
}

function formatItemTime(item, options = {}) {
  const showTimezone = options.showTimezone !== false;
  if (item.startTbd && item.endTbd) return "Start TBD / End TBD";
  if (item.startTbd) {
    const end = item.endDateTime ? formatDateTimePiece(item.endDateTime, item.endTimezone || item.timezone, item.endTimeTbd, { showTimezone }) : "End TBD";
    return `Start TBD-${end}`;
  }
  if (!item.startDateTime) return "Start TBD";
  const start = item.startTimeTbd ? "Time TBD" : formatTime(item.startDateTime, { compact: true });
  const end = item.endTbd ? "" : item.endDateTime ? (item.endTimeTbd ? "Time TBD" : formatTime(item.endDateTime, { compact: true })) : "";
  const startTimezone = formatTimezone(item.startTimezone || item.timezone, { compact: true });
  const endTimezone = formatTimezone(item.endTimezone || item.timezone || item.startTimezone, { compact: true });
  if (!showTimezone && startTimezone === endTimezone) {
    if (item.endTbd) return `${start}-End TBD`;
    if (!end || end === start) return start;
    return `${start}-${end}`;
  }
  if (item.endTbd) return `${start} ${startTimezone}-End TBD`;
  if (!end || end === start) return `${start} ${startTimezone}`;
  if (startTimezone === endTimezone) return `${start}-${end} ${startTimezone}`;
  return `${start} ${startTimezone}-${end} ${endTimezone}`;
}

function formatDateTimePiece(dateTime, timezone, timeTbd, options = {}) {
  const time = timeTbd ? "Time TBD" : formatTime(dateTime, { compact: true });
  if (options.showTimezone === false) return time;
  return `${time} ${formatTimezone(timezone, { compact: true })}`;
}

function buildDateTimeValue(date, time, timeTbd) {
  if (!date) return "";
  return `${date}T${timeTbd || !time ? "00:00" : time}`;
}

function shiftDateTimeToDate(value, targetDate) {
  if (!value) return "";
  return `${targetDate}T${getTimePart(value) || "00:00"}`;
}

function shiftEndDateTimeToDate(item, targetDate) {
  if (!item.endDateTime) return "";
  if (!item.startDateTime) return shiftDateTimeToDate(item.endDateTime, targetDate);

  const startDate = parseLocalDate(getDatePart(item.startDateTime));
  const endDate = parseLocalDate(getDatePart(item.endDateTime));
  const dayDelta = Math.round((endDate - startDate) / 86400000);
  const targetEndDate = parseLocalDate(targetDate);
  targetEndDate.setDate(targetEndDate.getDate() + dayDelta);
  return `${toIsoDate(targetEndDate)}T${getTimePart(item.endDateTime) || "00:00"}`;
}

function normalizeTimezone(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return DEFAULT_TIMEZONE;
  if (["beijing", "beijing time", "asia/shanghai", "asia/beijing", "china standard time", "beijing standard time"].includes(normalized)) {
    return "BEIJING";
  }
  if (["us est", "est", "edt", "us eastern", "eastern", "america/new_york"].includes(normalized)) {
    return "US_EST";
  }
  if (["us cdt", "cdt", "cst", "us central", "central", "america/chicago"].includes(normalized)) {
    return "US_CDT";
  }
  if (TIMEZONES.some((timezone) => timezone.value === value)) return value;
  return DEFAULT_TIMEZONE;
}

function normalizeCurrency(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CNY") return "RMB";
  return CURRENCIES.includes(normalized) ? normalized : "USD";
}

function normalizeCostValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return "";
  return String(amount);
}

function normalizeCostSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return {
    displayCurrency: normalizeCurrency(source.displayCurrency),
    usdToRmbRate: normalizeExchangeRate(source.usdToRmbRate),
  };
}

function normalizeExchangeRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_TO_RMB_RATE;
}

function formatTimezone(value, options = {}) {
  const timezone = TIMEZONES.find((entry) => entry.value === normalizeTimezone(value));
  if (!timezone) return options.compact ? "北京" : "北京时间";
  return options.compact ? timezone.shortLabel : timezone.label;
}

function formatCost(item) {
  return formatCostAmount(item.cost, item.currency);
}

function formatCostAmount(cost, currency) {
  const amount = Number(cost || 0);
  const formattedAmount = amount.toLocaleString([], {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
  return `${normalizeCurrency(currency)} ${formattedAmount}`;
}

function formatTime(value, options = {}) {
  const date = new Date(value);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "pm" : "am";
  if (options.compact && minute === 0) return `${displayHour}${period}`;
  return `${displayHour}:${String(minute).padStart(2, "0")}${options.compact ? period : ` ${period.toUpperCase()}`}`;
}

function formatDateLong(value) {
  return parseLocalDate(value).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(value) {
  return parseLocalDate(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDatePart(value) {
  return value ? value.slice(0, 10) : "";
}

function getTimePart(value) {
  return value && value.includes("T") ? value.slice(11, 16) : "";
}

function splitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
