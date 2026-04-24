export const STORAGE_KEY = "trip-planner-v1";

export const ITEM_TYPES = [
  "Flight",
  "Hotel",
  "Activity",
  "Family Visit",
  "Meal",
  "Lesson",
  "Transit",
  "Rest",
  "Reminder",
  "Custom",
];

export const DEFAULT_ITEM_TYPE_COLORS = {
  Flight: "#b84a4a",
  Hotel: "#2563eb",
  Activity: "#2f6f73",
  "Family Visit": "#4d7c8a",
  Meal: "#7c3aed",
  Lesson: "#8b5e34",
  Transit: "#b88a2d",
  Rest: "#16a34a",
  Reminder: "#2f6f73",
  Custom: "#2f6f73",
};

export const STATUSES = ["Idea", "Planned", "Booked", "Confirmed", "Done", "Skipped"];

export const CURRENCIES = ["USD", "RMB"];
export const DEFAULT_USD_TO_RMB_RATE = 7.2;
export const PACK_STATUSES = ["Idea", "Purchased", "Packed"];
export const BAG_SIZES = [
  { value: "personal", label: "Personal" },
  { value: "carry-on", label: "Carry-on" },
  { value: "checked-small", label: "Checked small" },
  { value: "checked-large", label: "Checked large" },
  { value: "custom", label: "Custom" },
];
export const DEFAULT_PACK_CATEGORIES = [
  {
    id: "pack-clothing",
    label: "Clothing",
    icon: "\u{1F455}",
    order: 0,
    subcategories: [
      { id: "pack-clothing-tops", label: "Tops", order: 0 },
      { id: "pack-clothing-bottoms", label: "Bottoms", order: 1 },
      { id: "pack-clothing-underwear", label: "Underwear", order: 2 },
      { id: "pack-clothing-socks", label: "Socks", order: 3 },
      { id: "pack-clothing-outerwear", label: "Outerwear", order: 4 },
      { id: "pack-clothing-shoes", label: "Shoes", order: 5 },
      { id: "pack-clothing-accessories", label: "Accessories", order: 6 },
    ],
  },
  {
    id: "pack-toiletries",
    label: "Toiletries",
    icon: "\u{1F9F4}",
    order: 1,
    subcategories: [
      { id: "pack-toiletries-skincare", label: "Skincare", order: 0 },
      { id: "pack-toiletries-hair-care", label: "Hair Care", order: 1 },
      { id: "pack-toiletries-medicine", label: "Medicine", order: 2 },
      { id: "pack-toiletries-personal-care", label: "Personal Care", order: 3 },
    ],
  },
  {
    id: "pack-electronics",
    label: "Electronics",
    icon: "\u{1F50C}",
    order: 2,
    subcategories: [
      { id: "pack-electronics-devices", label: "Devices", order: 0 },
      { id: "pack-electronics-cables-adapters", label: "Cables & Adapters", order: 1 },
      { id: "pack-electronics-entertainment", label: "Entertainment", order: 2 },
    ],
  },
  {
    id: "pack-documents",
    label: "Documents",
    icon: "\u{1F4C4}",
    order: 3,
    subcategories: [
      { id: "pack-documents-passport-id", label: "Passport & ID", order: 0 },
      { id: "pack-documents-travel-docs", label: "Travel Docs", order: 1 },
      { id: "pack-documents-money-cards", label: "Money & Cards", order: 2 },
    ],
  },
  {
    id: "pack-food",
    label: "Food",
    icon: "\u{1F34E}",
    order: 4,
    subcategories: [
      { id: "pack-food-airplane-snacks", label: "Airplane Snacks", order: 0 },
      { id: "pack-food-kids-snacks", label: "Kids Snacks", order: 1 },
      { id: "pack-food-meals-supplies", label: "Meals & Supplies", order: 2 },
    ],
  },
  {
    id: "pack-kids",
    label: "Kids",
    icon: "\u{1F9F8}",
    order: 5,
    subcategories: [
      { id: "pack-kids-nora", label: "Nora", order: 0 },
      { id: "pack-kids-freddie", label: "Freddie", order: 1 },
      { id: "pack-kids-toys", label: "Toys", order: 2 },
      { id: "pack-kids-activities", label: "Activities", order: 3 },
    ],
  },
  {
    id: "pack-gifts",
    label: "Gifts",
    icon: "\u{1F381}",
    order: 6,
    subcategories: [],
  },
  {
    id: "pack-misc",
    label: "Misc",
    icon: "\u{1F4E6}",
    order: 7,
    subcategories: [],
  },
];

export const STATUS_ICONS = {
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

export const DEFAULT_PEOPLE = ["Dad", "Mom", "Nora", "Freddie"];
export const DEFAULT_PACK_TAGS = ["Mom", "Dad", "Freddie", "Nora", "Shared"];

export const TIMEZONES = [
  { value: "US_EST", label: "US EST", shortLabel: "ET" },
  { value: "US_CDT", label: "US CDT", shortLabel: "CT" },
  { value: "US_PT", label: "美国太平洋时间", shortLabel: "PT" },
  { value: "BEIJING", label: "北京时间", shortLabel: "北京" },
];

export const DEFAULT_TIMEZONE = "BEIJING";
