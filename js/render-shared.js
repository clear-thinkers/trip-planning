import { CURRENCIES, DEFAULT_ITEM_TYPE_COLORS, STATUS_ICONS } from "./constants.js";
import { normalizeCurrency, normalizeHexColor, state } from "./state.js";
import { escapeHtml, formatCost, formatItemTime } from "./format.js";
import { getWarnings } from "./warnings.js";

export function getDefaultItemTypeColor(type) {
  return DEFAULT_ITEM_TYPE_COLORS[type] || DEFAULT_ITEM_TYPE_COLORS.Custom;
}

export function getItemTypeColor(type) {
  return normalizeHexColor(state.trip?.itemTypeColors?.[type]) || getDefaultItemTypeColor(type);
}

export function renderItemTypeStyle(type) {
  return `style="--item-type-color: ${escapeHtml(getItemTypeColor(type))};"`;
}

export function renderCurrencyOptions(selected = "USD") {
  const normalized = normalizeCurrency(selected);
  return CURRENCIES.map((currency) => `<option value="${currency}" ${currency === normalized ? "selected" : ""}>${currency}</option>`).join("");
}

export function renderTimelineRow(item, options = {}) {
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

export function renderStatusIcon(status) {
  const icon = STATUS_ICONS[status] || STATUS_ICONS.Idea;
  const label = status || "Idea";
  return `
    <span class="status-icon ${icon.className}" role="img" aria-label="${escapeHtml(`Status: ${label}`)}" title="${escapeHtml(label)}">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon.path}</svg>
    </span>
  `;
}

export function getItemMeta(item) {
  if (item.type === "Flight") {
    const route = [item.departureCity, item.arrivalCity].filter(Boolean).join(" to ");
    return ["Flight", item.airline, route].filter(Boolean).join(" - ");
  }
  return [item.type, item.city, item.location].filter(Boolean).join(" - ");
}
