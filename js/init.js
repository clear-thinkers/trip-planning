import { CURRENCIES, DEFAULT_PEOPLE, ITEM_TYPES, STATUSES, TIMEZONES } from "./constants.js";
import { debounce } from "./format.js";
import { requestRender, state } from "./state.js";
import { createNewTrip, deleteCurrentItem, exportTrip, getSelectedFilterValues, importTrip, openItemDialog, printCalendar, saveItemFromForm, setSelectedFilterValues, closeItemDialog, copyCurrentItemToDate, updateTripSettings } from "./render-views.js";
import { closePackItemDialog, deleteCurrentPackItem, savePackItemFromForm, syncPackItemSubcategoryOptions } from "./render-packing.js";

const render = requestRender;

export const els = {};

export function cacheElements() {
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
    "costAmountFilter",
    "costAmountFilterLabel",
    "searchInput",
    "alerts",
    "contentGrid",
    "calendarView",
    "listView",
    "dayView",
    "planningView",
    "packingView",
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
    "packItemDialog",
    "packItemForm",
    "packDialogTitle",
    "packDialogEyebrow",
    "closePackDialogButton",
    "cancelPackItemButton",
    "deletePackItemButton",
    "packItemId",
    "packItemTitle",
    "packItemCategory",
    "packItemSubCategory",
    "packItemStatus",
    "packItemQuantity",
    "packItemTags",
    "packItemBag",
    "packItemCost",
    "packItemCurrency",
    "packItemNotes",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
  els.tabs = Array.from(document.querySelectorAll(".tab-button"));
  els.views = Array.from(document.querySelectorAll(".view-panel"));
  els.filterToggles = Array.from(document.querySelectorAll("[data-filter-toggle]"));
}

export function populateSelects() {
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

export function populateTimezoneSelect(select) {
  TIMEZONES.forEach((timezone) => {
    select.append(new Option(timezone.label, timezone.value));
  });
}

export function populatePeopleSelect(extraPeople = []) {
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

export function getSelectedPeople() {
  if (!els.itemPeople) return [];
  return Array.from(els.itemPeople.selectedOptions || []).map((option) => option.value);
}

export function setSelectedPeople(people) {
  const selected = new Set(people);
  Array.from(els.itemPeople.options).forEach((option) => {
    option.selected = selected.has(option.value);
  });
}

export function updateItemFormForType() {
  const isFlight = els.itemType.value === "Flight";
  els.genericCityField.hidden = isFlight;
  els.genericLocationField.hidden = isFlight;
  els.flightDepartureField.hidden = !isFlight;
  els.flightArrivalField.hidden = !isFlight;
  els.flightAirlineField.hidden = !isFlight;
}

export function updateDateTimeTbdControls() {
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

export function bindEvents() {
  window.addEventListener("resize", debounce(() => {
    if (state.screen !== "workspace") return;
    render();
  }, 120));

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
    if (state.view === "costs") {
      state.costFilters.operator = els.typeFilter.value;
    } else if (state.view === "packing") {
      state.packingFilters.status = getSelectedFilterValues(els.typeFilter);
      setSelectedFilterValues(els.typeFilter, state.packingFilters.status);
    } else if (state.view === "planning") {
      state.todoFilters.status = getSelectedFilterValues(els.typeFilter);
      setSelectedFilterValues(els.typeFilter, state.todoFilters.status);
    } else {
      state.filters.type = getSelectedFilterValues(els.typeFilter);
      setSelectedFilterValues(els.typeFilter, state.filters.type);
    }
    render();
  });
  els.statusFilter.addEventListener("change", () => {
    if (state.view === "costs") {
      state.costFilters.currency = els.statusFilter.value;
    } else if (state.view === "packing") {
      state.packingFilters.tags = getSelectedFilterValues(els.statusFilter);
      setSelectedFilterValues(els.statusFilter, state.packingFilters.tags);
    } else if (state.view === "planning") {
      state.todoFilters.dueDate = getSelectedFilterValues(els.statusFilter);
      setSelectedFilterValues(els.statusFilter, state.todoFilters.dueDate);
    } else {
      state.filters.status = getSelectedFilterValues(els.statusFilter);
      setSelectedFilterValues(els.statusFilter, state.filters.status);
    }
    render();
  });
  els.searchInput.addEventListener("input", debounce(() => {
    if (state.view === "costs") {
      state.costFilters.search = els.searchInput.value.trim().toLowerCase();
    } else if (state.view === "packing") {
      state.packingFilters.search = els.searchInput.value.trim().toLowerCase();
    } else if (state.view === "planning") {
      state.todoFilters.search = els.searchInput.value.trim().toLowerCase();
    } else {
      state.filters.search = els.searchInput.value.trim().toLowerCase();
    }
    render();
  }, 150));
  els.costAmountFilter?.addEventListener("input", debounce(() => {
    if (state.view !== "costs") return;
    state.costFilters.amount = els.costAmountFilter.value.trim();
    render();
  }, 150));

  els.addItemButton.addEventListener("click", () => openItemDialog());
  els.itemForm.addEventListener("submit", saveItemFromForm);
  els.closeDialogButton.addEventListener("click", closeItemDialog);
  els.cancelItemButton.addEventListener("click", closeItemDialog);
  els.deleteItemButton.addEventListener("click", deleteCurrentItem);
  els.copyItemButton.addEventListener("click", copyCurrentItemToDate);
  els.printCalendarButton.addEventListener("click", printCalendar);
  els.exportButton.addEventListener("click", exportTrip);
  els.importInput.addEventListener("change", importTrip);
  els.packItemCategory?.addEventListener("change", () => syncPackItemSubcategoryOptions());
  els.packItemForm?.addEventListener("submit", savePackItemFromForm);
  els.closePackDialogButton?.addEventListener("click", closePackItemDialog);
  els.cancelPackItemButton?.addEventListener("click", closePackItemDialog);
  els.deletePackItemButton?.addEventListener("click", deleteCurrentPackItem);
}

export function toggleFilterSelect(button) {
  const field = button.closest(".filter-select-field");
  const select = document.getElementById(button.getAttribute("aria-controls"));
  if (!field || !select) return;
  const expanded = !field.classList.contains("expanded");
  field.classList.toggle("expanded", expanded);
  button.setAttribute("aria-expanded", String(expanded));
  button.textContent = expanded ? "Collapse" : "Expand";
  if (expanded) select.focus({ preventScroll: true });
}
