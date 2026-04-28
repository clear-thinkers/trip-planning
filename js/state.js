import {
  BAG_SIZES,
  CURRENCIES,
  DEFAULT_ITEM_TYPE_COLORS,
  DEFAULT_PACK_TAGS,
  DEFAULT_PACK_CATEGORIES,
  DEFAULT_PEOPLE,
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
  currentIdentityId: null,
  screen: "trips",
  view: "calendar",
  packingSubView: "list",
  selectedDate: null,
  isPrinting: false,
  warningsExpanded: false,
  tripSettingsCollapsed: false,
  planningCalendarOpen: true,
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
    cloudId: trip.cloudId ?? null,
    permission: ["private", "read_only", "editor"].includes(trip.permission) ? trip.permission : "private",
    ownerId: trip.ownerId ?? null,
    title: trip.title || "New Trip",
    startDate: trip.startDate || toIsoDate(new Date()),
    endDate: trip.endDate || toIsoDate(new Date()),
    homeTimezone: normalizeTimezone(trip.homeTimezone),
    itemTypeColors: normalizeItemTypeColors(trip.itemTypeColors),
    costSettings: normalizeCostSettings(trip.costSettings),
    notes: trip.notes || "",
    people: Array.isArray(trip.people) ? trip.people.map((p) => String(p).trim()).filter(Boolean) : DEFAULT_PEOPLE.slice(),
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
  const today = toIsoDate(new Date());
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return {
    id: createId(),
    title: "New Trip",
    startDate: today,
    endDate: toIsoDate(end),
    homeTimezone: DEFAULT_TIMEZONE,
    itemTypeColors: normalizeItemTypeColors(),
    costSettings: normalizeCostSettings(),
    notes: "",
    todos: [],
    packCategories: normalizePackCategories(),
    packItems: [],
    bags: [],
    items: [],
  };
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
