import { CURRENCIES, DEFAULT_TIMEZONE, TIMEZONES } from "./constants.js";

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

export function formatItemTime(item, options = {}) {
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

export function formatDateTimePiece(dateTime, timezone, timeTbd, options = {}) {
  const time = timeTbd ? "Time TBD" : formatTime(dateTime, { compact: true });
  if (options.showTimezone === false) return time;
  return `${time} ${formatTimezone(timezone, { compact: true })}`;
}

export function buildDateTimeValue(date, time, timeTbd) {
  if (!date) return "";
  return `${date}T${timeTbd || !time ? "00:00" : time}`;
}

export function shiftDateTimeToDate(value, targetDate) {
  if (!value) return "";
  return `${targetDate}T${getTimePart(value) || "00:00"}`;
}

export function shiftEndDateTimeToDate(item, targetDate) {
  if (!item.endDateTime) return "";
  if (!item.startDateTime) return shiftDateTimeToDate(item.endDateTime, targetDate);

  const startDate = parseLocalDate(getDatePart(item.startDateTime));
  const endDate = parseLocalDate(getDatePart(item.endDateTime));
  const dayDelta = Math.round((endDate - startDate) / 86400000);
  const targetEndDate = parseLocalDate(targetDate);
  targetEndDate.setDate(targetEndDate.getDate() + dayDelta);
  return `${toIsoDate(targetEndDate)}T${getTimePart(item.endDateTime) || "00:00"}`;
}

export function formatTimezone(value, options = {}) {
  const timezone = TIMEZONES.find((entry) => entry.value === normalizeTimezone(value));
  if (!timezone) return options.compact ? "北京" : "北京时间";
  return options.compact ? timezone.shortLabel : timezone.label;
}

export function formatCost(item) {
  return formatCostAmount(item.cost, item.currency);
}

export function formatCostAmount(cost, currency) {
  const amount = Number(cost || 0);
  const formattedAmount = amount.toLocaleString([], {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });
  return `${normalizeCurrency(currency)} ${formattedAmount}`;
}

export function formatTime(value, options = {}) {
  const date = new Date(value);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "pm" : "am";
  if (options.compact && minute === 0) return `${displayHour}${period}`;
  return `${displayHour}:${String(minute).padStart(2, "0")}${options.compact ? period : ` ${period.toUpperCase()}`}`;
}

export function formatDateLong(value) {
  return parseLocalDate(value).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(value) {
  return parseLocalDate(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDatePart(value) {
  return value ? value.slice(0, 10) : "";
}

export function getTimePart(value) {
  return value && value.includes("T") ? value.slice(11, 16) : "";
}

export function splitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
