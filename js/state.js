import {
  BAG_SIZES,
  CURRENCIES,
  DEFAULT_ITEM_TYPE_COLORS,
  DEFAULT_PACK_TAGS,
  DEFAULT_PACK_CATEGORIES,
  DEFAULT_TIMEZONE,
  DEFAULT_USD_TO_RMB_RATE,
  ITEM_TYPES,
  PACK_STATUSES,
  STATUSES,
  STORAGE_KEY,
  TIMEZONES,
} from "./constants.js";
import { createId, parseLocalDate, splitList, toIsoDate } from "./format.js";

let renderCallback = () => {};

export function setRenderCallback(callback) {
  renderCallback = typeof callback === "function" ? callback : () => {};
}

export function requestRender() {
  renderCallback();
}

export const state = {
  store: loadStore(),
  trip: null,
  screen: "trips",
  view: "calendar",
  packingSubView: "list",
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
  todoFilters: {
    status: ["all"],
    dueDate: ["all"],
    search: "",
  },
  packingFilters: {
    status: ["all"],
    tags: ["all"],
    search: "",
  },
  costFilters: {
    operator: "all",
    amount: "",
    currency: "USD",
    search: "",
  },
};

export function loadStore() {
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

export function normalizeStore(store) {
  const trips = Array.isArray(store.trips) ? store.trips.map(normalizeTrip) : [];
  if (!trips.length) trips.push(createSampleTrip());
  const activeTripId = trips.some((trip) => trip.id === store.activeTripId) ? store.activeTripId : trips[0].id;
  return {
    version: 2,
    activeTripId,
    trips,
  };
}

export function getActiveTrip() {
  if (!state.store.trips.length) {
    const sampleTrip = createSampleTrip();
    state.store.trips.push(sampleTrip);
    state.store.activeTripId = sampleTrip.id;
  }
  return state.store.trips.find((trip) => trip.id === state.store.activeTripId) || state.store.trips[0];
}

export function normalizeTrip(trip) {
  const packCategories = normalizePackCategories(trip.packCategories);
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
    packCategories,
    packItems: Array.isArray(trip.packItems) ? trip.packItems.map((item, index) => normalizePackItem(item, index)).filter((item) => item.title) : [],
    bags: Array.isArray(trip.bags) ? trip.bags.map((bag, index) => normalizeBag(bag, index)).filter((bag) => bag.label) : [],
  };
}

export function normalizeTodo(todo, fallbackOrder = 0) {
  const order = Number(todo.order);
  const subtodos = Array.isArray(todo.subtodos)
    ? todo.subtodos.map((subtodo, index) => normalizeSubtodo(subtodo, index)).filter((subtodo) => subtodo.text)
    : [];
  return {
    id: todo.id || createId(),
    text: String(todo.text || "").trim(),
    done: subtodos.some((subtodo) => !subtodo.done) ? false : Boolean(todo.done),
    order: Number.isFinite(order) ? order : fallbackOrder,
    dueDate: normalizeDueDate(todo.dueDate),
    cost: normalizeCostValue(todo.cost),
    currency: normalizeCurrency(todo.currency),
    subtodos,
    createdAt: todo.createdAt || new Date().toISOString(),
    updatedAt: todo.updatedAt || new Date().toISOString(),
  };
}

export function normalizeSubtodo(subtodo, fallbackOrder = 0) {
  const order = Number(subtodo.order);
  return {
    id: subtodo.id || createId(),
    text: String(subtodo.text || "").trim(),
    done: Boolean(subtodo.done),
    order: Number.isFinite(order) ? order : fallbackOrder,
    dueDate: normalizeDueDate(subtodo.dueDate),
    cost: normalizeCostValue(subtodo.cost),
    currency: normalizeCurrency(subtodo.currency),
    createdAt: subtodo.createdAt || new Date().toISOString(),
    updatedAt: subtodo.updatedAt || new Date().toISOString(),
  };
}

export function normalizeItemTypeColors(colors = {}) {
  const source = colors && typeof colors === "object" ? colors : {};
  return ITEM_TYPES.reduce((normalized, type) => {
    normalized[type] = normalizeHexColor(source[type]) || (DEFAULT_ITEM_TYPE_COLORS[type] || DEFAULT_ITEM_TYPE_COLORS.Custom);
    return normalized;
  }, {});
}

export function normalizeHexColor(value) {
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

export function normalizeItem(item) {
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

export function normalizePackCategories(categories) {
  const source = Array.isArray(categories) && categories.length ? categories : DEFAULT_PACK_CATEGORIES;
  return source
    .map((category, index) => {
      const defaultCategory = DEFAULT_PACK_CATEGORIES[index] || DEFAULT_PACK_CATEGORIES[DEFAULT_PACK_CATEGORIES.length - 1];
      const order = Number(category?.order);
      const subcategories = Array.isArray(category?.subcategories) ? category.subcategories : defaultCategory?.subcategories || [];
      return {
        id: String(category?.id || defaultCategory?.id || createId()).trim() || createId(),
        label: String(category?.label || defaultCategory?.label || "Category").trim() || "Category",
        icon: String(category?.icon || defaultCategory?.icon || "\u{1F4E6}").trim() || "\u{1F4E6}",
        order: Number.isFinite(order) ? order : index,
        subcategories: subcategories
          .map((subcategory, subIndex) => {
            const defaultSubcategory = defaultCategory?.subcategories?.[subIndex];
            const subOrder = Number(subcategory?.order);
            return {
              id: String(subcategory?.id || defaultSubcategory?.id || createId()).trim() || createId(),
              label: String(subcategory?.label || defaultSubcategory?.label || "Sub-category").trim(),
              order: Number.isFinite(subOrder) ? subOrder : subIndex,
            };
          })
          .filter((subcategory) => subcategory.label),
      };
    })
    .filter((category) => category.label);
}

export function normalizePackItem(item, fallbackOrder = 0) {
  const quantity = Number(item?.quantity);
  const order = Number(item?.order);
  const tags = Array.isArray(item?.tags)
    ? item.tags
    : item?.tags
      ? splitList(item.tags)
      : item?.person
        ? [String(item.person).trim()]
        : [];
  return {
    id: item?.id || createId(),
    title: String(item?.title || "").trim(),
    categoryId: String(item?.categoryId || "").trim(),
    subCategoryId: String(item?.subCategoryId || "").trim(),
    status: PACK_STATUSES.includes(item?.status) ? item.status : "Idea",
    quantity: Number.isFinite(quantity) && quantity >= 1 ? Math.round(quantity) : 1,
    person: String(item?.person || "").trim(),
    tags: [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].filter((tag) => DEFAULT_PACK_TAGS.includes(tag) || tag),
    bagId: String(item?.bagId || "").trim(),
    cost: normalizeCostValue(item?.cost),
    currency: normalizeCurrency(item?.currency),
    notes: String(item?.notes || "").trim(),
    order: Number.isFinite(order) ? order : fallbackOrder,
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || new Date().toISOString(),
  };
}

export function normalizeBag(bag, fallbackOrder = 0) {
  const order = Number(bag?.order);
  const allowedSizes = BAG_SIZES.map((entry) => entry.value);
  return {
    id: bag?.id || createId(),
    label: String(bag?.label || "").trim(),
    size: allowedSizes.includes(bag?.size) ? bag.size : "carry-on",
    weightLimit: String(bag?.weightLimit || "").trim(),
    color: normalizeHexColor(bag?.color) || "#4d7c8a",
    order: Number.isFinite(order) ? order : fallbackOrder,
  };
}

export function createSampleTrip() {
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
    packCategories: normalizePackCategories(),
    packItems: [],
    bags: [],
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

export function sampleItem(type, title, start, end, city, location, status, confirmationCode, people) {
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

export function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store));
}

export function normalizeTimezone(value) {
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

export function normalizeCurrency(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CNY") return "RMB";
  return CURRENCIES.includes(normalized) ? normalized : "USD";
}

export function normalizeCostValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return "";
  return String(amount);
}

export function normalizeDueDate(value) {
  const text = String(value || "").trim();
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  try {
    return toIsoDate(parseLocalDate(text)) === text ? text : "";
  } catch {
    return "";
  }
}

export function normalizeCostSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  return {
    displayCurrency: normalizeCurrency(source.displayCurrency),
    usdToRmbRate: normalizeExchangeRate(source.usdToRmbRate),
  };
}

export function normalizeExchangeRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_TO_RMB_RATE;
}

export function normalizeFilterValues(values) {
  const list = Array.isArray(values) ? values : [values];
  const specificValues = list.filter((value) => value && value !== "all");
  return specificValues.length ? specificValues : ["all"];
}

export function filterAllows(selectedValues, value) {
  const normalized = normalizeFilterValues(selectedValues);
  return normalized.includes("all") || normalized.includes(value);
}
