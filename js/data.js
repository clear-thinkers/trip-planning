import { state, filterAllows, normalizeCostSettings, normalizeCostValue, normalizeCurrency, normalizeFilterValues, normalizeTimezone } from "./state.js";
import { formatCostAmount, formatDateShort, getDatePart, parseLocalDate, toIsoDate } from "./format.js";

export function getCalendarDates() {
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

export function eachTripDate() {
  const dates = [];
  const start = parseLocalDate(state.trip.startDate);
  const end = parseLocalDate(state.trip.endDate);
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toIsoDate(cursor));
  }
  return dates;
}

export function getItemsForDate(date) {
  return filteredItems()
    .filter((item) => itemOccursOnDate(item, date))
    .sort(compareItems);
}

export function getTripTodos() {
  return (state.trip.todos || [])
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function getPlanningWeekEnd(date = new Date()) {
  const weekEnd = new Date(date);
  weekEnd.setHours(0, 0, 0, 0);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()) % 7);
  return toIsoDate(weekEnd);
}

export function getTodoDueBucket(dueDate, today = toIsoDate(new Date()), weekEnd = getPlanningWeekEnd()) {
  if (!dueDate) return "";
  if (dueDate < today) return "past-due";
  if (dueDate <= weekEnd) return "due-this-week";
  return "due-later";
}

export function getSubtodos(todo) {
  return (todo.subtodos || [])
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function getTravelCostEntries() {
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

export function getTodoCostEntries() {
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

export function getPackingCostEntries() {
  const categoryMap = new Map((state.trip.packCategories || []).map((category) => [category.id, category]));
  return (state.trip.packItems || [])
    .filter((item) => hasCost(item.cost))
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    .map((item) => {
      const category = categoryMap.get(item.categoryId);
      const subcategory = category?.subcategories?.find((entry) => entry.id === item.subCategoryId);
      return {
        title: item.title,
        meta: [category?.label || "Uncategorized", subcategory?.label || "General", (item.tags || []).join(", ")].filter(Boolean).join(" - "),
        cost: item.cost,
        currency: normalizeCurrency(item.currency),
        source: "packing",
      };
    });
}

export function formatCostTotals(entries, costSettings = getCostSettings()) {
  if (!entries.length) return "";
  const total = entries.reduce((sum, entry) => {
    return sum + convertCost(entry.cost, entry.currency, costSettings.displayCurrency, costSettings);
  }, 0);
  return formatCostAmount(total, costSettings.displayCurrency);
}

export function hasCost(value) {
  return normalizeCostValue(value) !== "";
}

export function getCostSettings() {
  state.trip.costSettings = normalizeCostSettings(state.trip.costSettings);
  return state.trip.costSettings;
}

export function convertCost(cost, fromCurrency, toCurrency, costSettings = getCostSettings()) {
  const amount = Number(cost || 0);
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return amount;
  if (from === "USD" && to === "RMB") return amount * costSettings.usdToRmbRate;
  if (from === "RMB" && to === "USD") return amount / costSettings.usdToRmbRate;
  return amount;
}

export function shouldShowTimezoneForItems(items) {
  const timezones = new Set(items.flatMap(getDisplayTimezones));
  return timezones.size > 1;
}

export function getDisplayTimezones(item) {
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

export function getTbdItems() {
  return filteredItems()
    .filter((item) => item.startTbd || !item.startDateTime)
    .sort(compareItems);
}

export function filteredItems() {
  return state.trip.items.filter((item) => {
    state.filters.type = normalizeFilterValues(state.filters.type);
    state.filters.status = normalizeFilterValues(state.filters.status);
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

export function itemOccursOnDate(item, date) {
  const startDate = getDatePart(item.startDateTime);
  const endDate = getDatePart(item.endDateTime) || startDate;
  if (!startDate) return false;
  return date >= startDate && date <= endDate;
}

export function compareItems(a, b) {
  return getSortDateTime(a).localeCompare(getSortDateTime(b)) || a.title.localeCompare(b.title);
}

export function getSortDateTime(item) {
  if (!item.startDateTime) return "";
  const date = getDatePart(item.startDateTime);
  if (item.startTimeTbd) return `${date}T99:99`;
  return item.startDateTime;
}

export function getPrimaryCity(date) {
  const cityCounts = new Map();
  state.trip.items
    .filter((item) => itemOccursOnDate(item, date) && item.city)
    .forEach((item) => cityCounts.set(item.city, (cityCounts.get(item.city) || 0) + 1));
  return [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

export function getTripCities(trip) {
  return [...new Set(trip.items.map((item) => item.city).filter(Boolean))].slice(0, 3).join(", ");
}

export function getPackItemsForCategory(categoryId) {
  return (state.trip.packItems || [])
    .filter((item) => item.categoryId === categoryId)
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title));
}

export function getPackingProgress(items = state.trip.packItems || []) {
  const counts = items.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item.status === "Packed") summary.packed += 1;
      if (item.status === "Purchased") summary.purchased += 1;
      if (item.status === "Idea") summary.idea += 1;
      return summary;
    },
    { total: 0, packed: 0, purchased: 0, idea: 0 },
  );
  return {
    ...counts,
    packedPercent: counts.total ? (counts.packed / counts.total) * 100 : 0,
  };
}
