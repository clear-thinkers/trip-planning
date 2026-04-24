import { BAG_SIZES, CURRENCIES, DEFAULT_PACK_TAGS, DEFAULT_PEOPLE, PACK_STATUSES } from "./constants.js";
import {
  filterAllows,
  normalizeBag,
  normalizeCurrency,
  normalizeFilterValues,
  normalizePackCategories,
  normalizePackItem,
  requestRender,
  state,
} from "./state.js";
import { convertCost, formatCostTotals, getCostSettings, getPackItemsForCategory, getPackingProgress } from "./data.js";
import { createId, escapeHtml, formatCostAmount } from "./format.js";
import { renderCurrencyOptions } from "./render-shared.js";
import { els } from "./init.js";

const render = requestRender;

function renderPackDragHandle() {
  return `
    <span class="todo-drag-handle pack-drag-handle" aria-hidden="true">
      <span class="pack-drag-glyph"></span>
    </span>
  `;
}

function getOrderedBags() {
  return (state.trip?.bags || [])
    .slice()
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

function getOrderedPackCategories() {
  return (state.trip?.packCategories || [])
    .slice()
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

function getBagSizeLabel(size) {
  return BAG_SIZES.find((entry) => entry.value === size)?.label || "Custom";
}

function getPackStatusClass(status) {
  if (status === "Purchased") return "confirmed";
  if (status === "Packed") return "packed";
  return "idea";
}

function getBagBadgeMarkup(bagId) {
  if (!bagId) return "";
  const bag = (state.trip?.bags || []).find((entry) => entry.id === bagId);
  if (!bag) return "";
  return `<span class="badge" style="background: ${escapeHtml(`${bag.color}1f`)}; color: ${escapeHtml(bag.color)}; border: 1px solid ${escapeHtml(`${bag.color}55`)};">${escapeHtml(bag.label)}</span>`;
}

function getPackCategoryOptions(selectedId = "") {
  return getOrderedPackCategories()
    .map((category) => `<option value="${category.id}" ${category.id === selectedId ? "selected" : ""}>${escapeHtml(category.label)}</option>`)
    .join("");
}

function getPackSubcategoryOptions(categoryId, selectedId = "") {
  const category = getOrderedPackCategories().find((entry) => entry.id === categoryId);
  const options = [{ id: "", label: "General" }, ...(category?.subcategories || [])];
  return options
    .map((subcategory) => `<option value="${subcategory.id}" ${subcategory.id === selectedId ? "selected" : ""}>${escapeHtml(subcategory.label)}</option>`)
    .join("");
}

function getPackBagOptions(selectedId = "") {
  return ['<option value="">Unassigned</option>', ...getOrderedBags().map((bag) => `<option value="${bag.id}" ${bag.id === selectedId ? "selected" : ""}>${escapeHtml(bag.label)}</option>`)].join("");
}

function getPackTagOptions(selectedValues = []) {
  const selected = new Set(selectedValues);
  return getPackingFilterTagOptions()
    .map((tag) => `<option value="${escapeHtml(tag)}" ${selected.has(tag) ? "selected" : ""}>${escapeHtml(tag)}</option>`)
    .join("");
}

export function getPackingFilterTagOptions() {
  const tags = [
    ...DEFAULT_PACK_TAGS,
    ...DEFAULT_PEOPLE,
    ...normalizeFilterValues(state.packingFilters.tags).filter((tag) => tag !== "all"),
    ...state.store.trips.flatMap((trip) => trip.items.flatMap((item) => item.people || [])),
    ...(state.trip?.packItems || []).flatMap((item) => item.tags || []),
  ];
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getSelectedPackTags() {
  if (!els.packItemTags) return [];
  return Array.from(els.packItemTags.selectedOptions || []).map((option) => option.value);
}

function syncPackItemSubcategoryOptions(selectedId = "") {
  if (!els.packItemCategory || !els.packItemSubCategory) return;
  els.packItemSubCategory.innerHTML = getPackSubcategoryOptions(els.packItemCategory.value, selectedId);
}

function getPackGroupItems(categoryId, subCategoryId = "") {
  return getPackItemsForCategory(categoryId).filter((item) => (item.subCategoryId || "") === (subCategoryId || ""));
}

function getFilteredPackItems() {
  const selectedStatuses = normalizeFilterValues(state.packingFilters.status);
  const selectedTags = normalizeFilterValues(state.packingFilters.tags);
  const categoryMap = new Map((state.trip?.packCategories || []).map((category) => [category.id, category]));
  const bagMap = new Map((state.trip?.bags || []).map((bag) => [bag.id, bag]));
  return (state.trip?.packItems || []).filter((item) => {
    const category = categoryMap.get(item.categoryId);
    const subcategory = category?.subcategories?.find((entry) => entry.id === item.subCategoryId);
    const statusMatch = filterAllows(selectedStatuses, item.status);
    const tagMatch = selectedTags.includes("all") || (item.tags || []).some((tag) => selectedTags.includes(tag));
    const haystack = [
      item.title,
      item.status,
      category?.label,
      subcategory?.label,
      ...(item.tags || []),
      bagMap.get(item.bagId || "")?.label,
      item.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const searchMatch = !state.packingFilters.search || haystack.includes(state.packingFilters.search);
    return statusMatch && tagMatch && searchMatch;
  });
}

function getFilteredPackItemsForCategory(categoryId) {
  return getFilteredPackItems()
    .filter((item) => item.categoryId === categoryId)
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title));
}

function renumberPackItems() {
  const grouped = new Map();
  (state.trip.packItems || []).forEach((item) => {
    const key = `${item.categoryId}::${item.subCategoryId || ""}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });
  grouped.forEach((items) => {
    items
      .slice()
      .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title))
      .forEach((item, index) => {
        item.order = index;
      });
  });
}

function reorderPackItem(draggedId, targetId, categoryId, subCategoryId = "", position = "before") {
  if (!draggedId || !targetId || draggedId === targetId) return;
  const dragged = (state.trip.packItems || []).find((item) => item.id === draggedId);
  if (!dragged) return;
  const targetGroup = getPackGroupItems(categoryId, subCategoryId);
  const targetIndex = targetGroup.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) return;
  const filteredTargetGroup = targetGroup.filter((item) => item.id !== draggedId);
  dragged.categoryId = categoryId;
  dragged.subCategoryId = subCategoryId;
  filteredTargetGroup.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, dragged);
  filteredTargetGroup.forEach((item, index) => {
    item.order = index;
    item.updatedAt = new Date().toISOString();
  });
  renumberPackItems();
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function reorderBag(draggedId, targetId, position = "before") {
  if (!draggedId || !targetId || draggedId === targetId) return;
  const ordered = getOrderedBags().filter((bag) => bag.id !== draggedId);
  const dragged = (state.trip.bags || []).find((bag) => bag.id === draggedId);
  if (!dragged) return;
  const targetIndex = ordered.findIndex((bag) => bag.id === targetId);
  if (targetIndex < 0) return;
  ordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, dragged);
  state.trip.bags = ordered.map((bag, index) => ({ ...bag, order: index }));
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function reorderPackCategory(draggedId, targetId, position = "before") {
  if (!draggedId || !targetId || draggedId === targetId) return;
  const ordered = getOrderedPackCategories().filter((category) => category.id !== draggedId);
  const dragged = (state.trip.packCategories || []).find((category) => category.id === draggedId);
  if (!dragged) return;
  const targetIndex = ordered.findIndex((category) => category.id === targetId);
  if (targetIndex < 0) return;
  ordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, dragged);
  state.trip.packCategories = ordered.map((category, index) => ({ ...category, order: index }));
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function reorderPackSubcategory(categoryId, draggedId, targetId, position = "before") {
  const category = (state.trip.packCategories || []).find((entry) => entry.id === categoryId);
  if (!category || !draggedId || !targetId || draggedId === targetId) return;
  const ordered = (category.subcategories || []).slice().sort((a, b) => a.order - b.order).filter((subcategory) => subcategory.id !== draggedId);
  const dragged = (category.subcategories || []).find((subcategory) => subcategory.id === draggedId);
  if (!dragged) return;
  const targetIndex = ordered.findIndex((subcategory) => subcategory.id === targetId);
  if (targetIndex < 0) return;
  ordered.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, dragged);
  category.subcategories = ordered.map((subcategory, index) => ({ ...subcategory, order: index }));
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function addPackSubcategory(categoryId, label) {
  const trimmed = String(label || "").trim();
  if (!trimmed) return;
  state.trip.packCategories = (state.trip.packCategories || []).map((category) => {
    if (category.id !== categoryId) return category;
    const order = Math.max(-1, ...(category.subcategories || []).map((subcategory) => Number(subcategory.order) || 0)) + 1;
    return {
      ...category,
      subcategories: [
        ...(category.subcategories || []),
        {
          id: createId(),
          label: trimmed,
          order,
        },
      ],
    };
  });
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function updatePackSubcategory(categoryId, subcategoryId, patch) {
  state.trip.packCategories = (state.trip.packCategories || []).map((category) => {
    if (category.id !== categoryId) return category;
    return {
      ...category,
      subcategories: (category.subcategories || []).map((subcategory) =>
        subcategory.id === subcategoryId
          ? {
              ...subcategory,
              ...patch,
            }
          : subcategory,
      ),
    };
  });
  state.trip.updatedAt = new Date().toISOString();
}

function deletePackSubcategory(categoryId, subcategoryId) {
  const affectedCount = (state.trip.packItems || []).filter((item) => item.categoryId === categoryId && item.subCategoryId === subcategoryId).length;
  if (affectedCount && !window.confirm(`Remove this sub-category?\n\n${affectedCount} packing item${affectedCount === 1 ? "" : "s"} will move to General.`)) return;
  state.trip.packCategories = (state.trip.packCategories || []).map((category) => {
    if (category.id !== categoryId) return category;
    return {
      ...category,
      subcategories: (category.subcategories || [])
        .filter((subcategory) => subcategory.id !== subcategoryId)
        .map((subcategory, index) => ({ ...subcategory, order: index })),
    };
  });
  state.trip.packItems = (state.trip.packItems || []).map((item) =>
    item.categoryId === categoryId && item.subCategoryId === subcategoryId
      ? { ...item, subCategoryId: "", updatedAt: new Date().toISOString() }
      : item,
  );
  state.trip.updatedAt = new Date().toISOString();
  render();
}

function addInlinePackItem(categoryId, title, subCategoryId = "") {
  const trimmed = String(title || "").trim();
  if (!trimmed) return "";
  const groupItems = getPackGroupItems(categoryId, subCategoryId);
  const packItem = normalizePackItem({
    id: createId(),
    title: trimmed,
    categoryId,
    subCategoryId,
    status: "Idea",
    quantity: 1,
    order: groupItems.length,
  });
  state.trip.packItems = [...(state.trip.packItems || []), packItem];
  state.trip.updatedAt = new Date().toISOString();
  render();
  return packItem.id;
}

function getGroupDropPosition(event, element) {
  const rect = element.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function getPackingItemsForBag(bagId = "") {
  return getFilteredPackItems()
    .filter((item) => (item.bagId || "") === (bagId || ""))
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

function getBagCostTotal(items) {
  const costSettings = getCostSettings();
  if (!items.length) return "";
  const total = items.reduce((sum, item) => sum + convertCost(item.cost, item.currency, costSettings.displayCurrency, costSettings), 0);
  return total ? formatCostAmount(total, costSettings.displayCurrency) : "";
}

export function renderPackProgressBar(progress) {
  const total = progress.total || 1;
  const ideaWidth = `${(progress.idea / total) * 100}%`;
  const purchasedWidth = `${(progress.purchased / total) * 100}%`;
  const packedWidth = `${(progress.packed / total) * 100}%`;
  return `
    <div class="pack-progress-bar" aria-label="${escapeHtml(`Packed ${progress.packed} of ${progress.total} items`)}}">
      <span style="width: ${ideaWidth}; background: rgba(107, 114, 128, 0.2);"></span>
      <span style="width: ${purchasedWidth}; background: rgba(47, 111, 115, 0.24);"></span>
      <span style="width: ${packedWidth}; background: rgba(179, 203, 21, 0.5);"></span>
    </div>
  `;
}

export function renderPackItem(item) {
  const statusClass = getPackStatusClass(item.status);
  const tagBadges = (item.tags || []).slice(0, 2).map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("");
  return `
    <div
      class="todo-item"
      style="grid-template-columns: auto minmax(0, 1fr) auto auto auto auto auto; min-height: 48px;"
      draggable="true"
      data-pack-item-id="${item.id}"
      data-pack-category-id="${item.categoryId}"
      data-pack-subcategory-id="${item.subCategoryId || ""}"
    >
      <button class="status-pill-button" data-pack-action="cycle-status" data-id="${item.id}" type="button">
        <span class="badge ${statusClass}" style="pointer-events: none;">${escapeHtml(item.status)}</span>
      </button>
      <button class="todo-text-button" data-pack-action="edit" data-id="${item.id}" type="button">${escapeHtml(item.title)}</button>
      ${item.quantity > 1 ? `<span class="badge">&times;${item.quantity}</span>` : ""}
      ${tagBadges}
      ${item.cost ? `<span class="badge">${escapeHtml(formatCostAmount(item.cost, item.currency))}</span>` : ""}
      ${getBagBadgeMarkup(item.bagId)}
      <button class="icon-button todo-delete-button" data-pack-action="delete" data-id="${item.id}" type="button" aria-label="Delete packing item">x</button>
    </div>
  `;
}

export function renderPackChip(item) {
  const dotColor = item.status === "Packed" ? "#B3CB15" : item.status === "Purchased" ? "#1f5c60" : "#6b7280";
  const primaryTag = item.tags?.[0];
  return `
    <button
      class="item-pill pack-chip"
      type="button"
      draggable="true"
      data-pack-chip-id="${item.id}"
      data-pack-action="edit"
      data-id="${item.id}"
      style="padding: 8px 10px; border-left-width: 3px; margin: 0; display: flex; align-items: center; gap: 8px;"
    >
      <span aria-hidden="true" style="background: ${escapeHtml(dotColor)}; border-radius: 999px; flex: 0 0 auto; height: 10px; width: 10px;"></span>
      <span style="flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.title)}</span>
      ${primaryTag ? `<span class="badge">${escapeHtml(primaryTag)}</span>` : ""}
    </button>
  `;
}

export function renderBagColumn(bag, items) {
  const progress = getPackingProgress(items);
  const totalCost = getBagCostTotal(items);
  const isUnassigned = !bag;
  return `
    <section
      class="bag-column"
      data-bag-drop-zone="${bag?.id || ""}"
      style="${!isUnassigned ? `--bag-accent: ${bag.color};` : "--bag-accent: #94a3b8;"}"
    >
      <div class="section-header" style="align-items: start; margin-bottom: 8px;">
        <div>
          <h3 style="margin-bottom: 4px;">${escapeHtml(isUnassigned ? "Unassigned" : bag.label)}</h3>
          <p class="muted" style="margin-bottom: 4px;">${escapeHtml(isUnassigned ? "Items without a bag" : getBagSizeLabel(bag.size))}</p>
          ${!isUnassigned && bag.weightLimit ? `<span class="badge">${escapeHtml(`${bag.weightLimit} kg limit`)}</span>` : ""}
        </div>
        <span class="badge">${items.length} item${items.length === 1 ? "" : "s"}</span>
      </div>
      <div class="todo-list" style="margin-bottom: 10px;">
        ${items.length ? items.map(renderPackChip).join("") : `<div class="empty-state compact">No items here.</div>`}
      </div>
      ${renderPackProgressBar(progress)}
      <div class="status-line" style="margin-top: 10px;">
        <span class="badge">${progress.packed}/${progress.total || 0} packed</span>
        ${totalCost ? `<span class="badge">${escapeHtml(totalCost)}</span>` : ""}
      </div>
    </section>
  `;
}

export function renderPackingControls() {
  const bags = getOrderedBags();
  const categories = getOrderedPackCategories();
  const bagRows = bags.length
    ? bags
        .map(
          (bag) => `
            <div class="type-color-row pack-control-row" draggable="true" data-bag-row="${bag.id}" style="grid-template-columns: auto minmax(0, 1fr) auto;">
              ${renderPackDragHandle()}
              <div class="type-color-label pack-control-fields" style="align-items: stretch; flex-wrap: wrap;">
                <input data-bag-field="label" data-id="${bag.id}" type="text" value="${escapeHtml(bag.label)}" aria-label="Bag label" style="max-width: 220px;" />
                <select data-bag-field="size" data-id="${bag.id}" aria-label="Bag size" style="max-width: 180px;">
                  ${BAG_SIZES.map((entry) => `<option value="${entry.value}" ${entry.value === bag.size ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}
                </select>
                <input data-bag-field="weightLimit" data-id="${bag.id}" type="number" min="0" step="0.1" value="${escapeHtml(bag.weightLimit)}" placeholder="Weight limit (kg)" aria-label="Bag weight limit" style="max-width: 170px;" />
              </div>
              <div class="type-color-controls">
                <input data-bag-field="color" data-id="${bag.id}" type="color" value="${escapeHtml(bag.color)}" aria-label="Bag color" />
                <button class="danger-button compact-button" data-pack-action="delete-bag" data-id="${bag.id}" type="button">Delete</button>
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state compact">No bags yet. Add one to start planning assignments.</div>`;
  const categoryRows = categories.length
    ? categories
        .map((category) => {
          const assignedCount = (state.trip.packItems || []).filter((item) => item.categoryId === category.id).length;
          return `
            <details class="section-block" open>
              <summary class="section-header">
                <div style="align-items: center; display: flex; gap: 10px;">
                  <span>${escapeHtml(category.icon)}</span>
                  <strong>${escapeHtml(category.label)}</strong>
                </div>
                <span class="badge">${assignedCount} item${assignedCount === 1 ? "" : "s"}</span>
              </summary>
              <div class="type-color-row pack-control-row" draggable="true" data-pack-category-row="${category.id}" style="grid-template-columns: auto minmax(0, 1fr) auto;">
                ${renderPackDragHandle()}
                <div class="type-color-label pack-control-fields" style="align-items: stretch; flex-wrap: wrap;">
                  <input data-pack-category-field="icon" data-id="${category.id}" type="text" value="${escapeHtml(category.icon)}" aria-label="Category icon" style="max-width: 76px;" />
                  <input data-pack-category-field="label" data-id="${category.id}" type="text" value="${escapeHtml(category.label)}" aria-label="Category label" style="max-width: 260px;" />
                </div>
                <div class="type-color-controls">
                  <button class="danger-button compact-button" data-pack-action="delete-category" data-id="${category.id}" type="button">Delete</button>
                </div>
              </div>
              <div class="todo-list" style="margin-top: 10px;">
                ${
                  category.subcategories.length
                    ? category.subcategories
                        .slice()
                        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
                        .map(
                          (subcategory) => `
                            <div class="subtodo-item pack-subcategory-row" draggable="true" data-pack-subcategory-row="${subcategory.id}" data-pack-category-id="${category.id}">
                              ${renderPackDragHandle()}
                              <input
                                data-pack-subcategory-field="label"
                                data-id="${subcategory.id}"
                                data-pack-category-id="${category.id}"
                                type="text"
                                value="${escapeHtml(subcategory.label)}"
                                aria-label="Sub-category label"
                                style="height: auto; min-height: 40px; min-width: 0; width: 100%;"
                              />
                              <button class="icon-button todo-delete-button" data-pack-action="delete-subcategory" data-id="${subcategory.id}" data-pack-category-id="${category.id}" type="button" aria-label="Delete sub-category">x</button>
                            </div>
                          `,
                        )
                        .join("")
                    : `<div class="empty-state compact">No sub-categories yet.</div>`
                }
              </div>
              <form class="todo-form" data-pack-subcategory-form data-id="${category.id}" style="margin-top: 10px;">
                <input name="label" type="text" placeholder="Add a sub-category" aria-label="New sub-category" />
                <button class="secondary-button" type="submit">Add</button>
              </form>
            </details>
          `;
        })
        .join("")
    : `<div class="empty-state compact">No categories yet.</div>`;
  return `
    <section class="section-block">
      <div class="section-header">
        <div>
          <p class="eyebrow">Packing setup</p>
          <h2>Packing controls</h2>
        </div>
      </div>
      <section class="section-block" style="box-shadow: none;">
        <div class="section-header">
          <div>
            <h3>Bags</h3>
            <p class="muted">Manage bag sizes, limits, and colors used across the packing planner.</p>
          </div>
          <button class="secondary-button" data-pack-action="add-bag" type="button">Add bag</button>
        </div>
        <div class="type-color-grid">${bagRows}</div>
      </section>
      <section class="section-block" style="box-shadow: none; margin-bottom: 0;">
        <div class="section-header">
          <div>
            <h3>Categories</h3>
            <p class="muted">Rename and reorder the two-level category tree used in the packing list.</p>
          </div>
          <button class="secondary-button" data-pack-action="add-category" type="button">Add category</button>
        </div>
        <div class="todo-list">${categoryRows}</div>
      </section>
    </section>
  `;
}

export function renderPackingList() {
  const categories = getOrderedPackCategories();
  const filteredItems = getFilteredPackItems();
  const progress = getPackingProgress(filteredItems);
  const categoryMarkup = categories
    .map((category) => {
      const categoryItems = getFilteredPackItemsForCategory(category.id);
      const generalItems = categoryItems.filter((item) => (item.subCategoryId || "") === "");
      const subcategoryGroups = category.subcategories
        .slice()
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
        .map((subcategory) => ({
          id: subcategory.id,
          label: subcategory.label,
          items: categoryItems.filter((item) => (item.subCategoryId || "") === subcategory.id),
        }))
        .filter((group) => group.items.length);
      const items = [...generalItems, ...subcategoryGroups.flatMap((group) => group.items)];
      const categoryProgress = getPackingProgress(items);
      return `
        <section class="section-block">
          <div class="section-header">
            <div style="align-items: center; display: flex; gap: 10px;">
              <span>${escapeHtml(category.icon)}</span>
              <h3 style="margin-bottom: 0;">${escapeHtml(category.label)}</h3>
            </div>
            <div class="status-line" style="margin-top: 0;">
              <span class="badge">${items.length} item${items.length === 1 ? "" : "s"}</span>
              <span class="badge packed">${categoryProgress.packed} packed</span>
            </div>
          </div>
          ${
            items.length
              ? `
                <div class="todo-list">
                  ${
                    generalItems.length
                      ? `
                        <div class="muted" style="font-size: 0.78rem; font-weight: 800; margin-bottom: 4px;">General</div>
                        ${generalItems.map(renderPackItem).join("")}
                      `
                      : ""
                  }
                  ${subcategoryGroups
                    .map(
                      (group) => `
                        <div class="muted" style="font-size: 0.78rem; font-weight: 800; margin: 6px 0 4px;">${escapeHtml(group.label)}</div>
                        ${group.items.map(renderPackItem).join("")}
                      `,
                    )
                    .join("")}
                </div>
              `
              : `<div class="empty-state compact">No packing items yet.</div>`
          }
          <form class="todo-form" data-pack-inline-form data-id="${category.id}" style="margin-top: 12px;">
            <input name="title" type="text" placeholder="Add a packing item" aria-label="New packing item" />
            <button class="secondary-button" type="submit">Add</button>
            <div class="todo-cost-row" style="grid-template-columns: minmax(0, 1fr);">
              <select name="subCategoryId" aria-label="Sub-category">
                ${getPackSubcategoryOptions(category.id)}
              </select>
            </div>
          </form>
        </section>
      `;
    })
    .join("");
  return `
    <section class="section-block">
      <div class="section-header">
        <div>
          <p class="eyebrow">Packing list</p>
          <h2>Packed: ${progress.packed} / ${progress.total} items</h2>
        </div>
        <button class="secondary-button" data-pack-action="open-new-item" type="button">Add item</button>
      </div>
      ${renderPackProgressBar(progress)}
      <div class="status-line" style="margin: 10px 0 0;">
        <span class="badge idea">${progress.idea} ideas</span>
        <span class="badge confirmed">${progress.purchased} purchased</span>
        <span class="badge packed">${progress.packed} packed</span>
      </div>
    </section>
    ${categoryMarkup}
  `;
}

export function renderBagPlanner() {
  const unassignedItems = getPackingItemsForBag("");
  const bags = getOrderedBags();
  return `
    <section class="section-block">
      <div class="section-header">
        <div>
          <p class="eyebrow">Bag planner</p>
          <h2>Bag assignments</h2>
        </div>
        <details>
          <summary class="secondary-button" style="display: inline-flex; align-items: center;">Add bag</summary>
          <form class="todo-form" data-bag-quick-form style="margin-top: 10px; min-width: 280px;">
            <input name="label" type="text" placeholder="Bag label" aria-label="Bag label" />
            <button class="secondary-button" type="submit">Save</button>
            <div class="todo-cost-row" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);">
              <select name="size" aria-label="Bag size">
                ${BAG_SIZES.map((entry) => `<option value="${entry.value}">${escapeHtml(entry.label)}</option>`).join("")}
              </select>
              <input name="weightLimit" type="number" min="0" step="0.1" placeholder="Weight limit (kg)" aria-label="Bag weight limit" />
            </div>
          </form>
        </details>
      </div>
      <div class="bag-planner">
        ${renderBagColumn(null, unassignedItems)}
        ${bags.map((bag) => renderBagColumn(bag, getPackingItemsForBag(bag.id))).join("")}
      </div>
    </section>
  `;
}

export function renderPacking() {
  if (!els.packingView) return;
  els.packingView.innerHTML = `
    <section class="section-block">
      <div class="section-header">
        <div>
          <p class="eyebrow">Packing</p>
          <h2>Packing planner</h2>
        </div>
        <div class="view-tabs" style="gap: 8px;">
          <button class="tab-button ${state.packingSubView === "list" ? "active" : ""}" data-packing-subview="list" type="button">Packing list</button>
          <button class="tab-button ${state.packingSubView === "planner" ? "active" : ""}" data-packing-subview="planner" type="button">Bag planner</button>
        </div>
      </div>
      ${state.packingSubView === "planner" ? renderBagPlanner() : renderPackingList()}
    </section>
  `;
  bindPackingActions(els.packingView);
  if (state.packingSubView === "planner") bindBagPlannerDragAndDrop();
}

export function openPackItemDialog(id = null, defaults = {}) {
  const item = id ? (state.trip.packItems || []).find((entry) => entry.id === id) : null;
  const firstCategoryId = getOrderedPackCategories()[0]?.id || "";
  if (!els.packItemDialog) return;
  els.packItemForm.reset();
  els.packItemId.value = item?.id || "";
  els.packItemTitle.value = item?.title || defaults.title || "";
  els.packItemCategory.innerHTML = getPackCategoryOptions(item?.categoryId || defaults.categoryId || firstCategoryId);
  syncPackItemSubcategoryOptions(item?.subCategoryId || defaults.subCategoryId || "");
  els.packItemStatus.innerHTML = PACK_STATUSES.map((status) => `<option value="${status}" ${status === (item?.status || "Idea") ? "selected" : ""}>${escapeHtml(status)}</option>`).join("");
  els.packItemQuantity.value = String(item?.quantity || 1);
  els.packItemTags.innerHTML = getPackTagOptions(item?.tags || (item?.person ? [item.person] : []));
  els.packItemBag.innerHTML = getPackBagOptions(item?.bagId || "");
  els.packItemCost.value = item?.cost || "";
  els.packItemCurrency.innerHTML = CURRENCIES.map((currency) => `<option value="${currency}" ${normalizeCurrency(item?.currency || "USD") === currency ? "selected" : ""}>${currency}</option>`).join("");
  els.packItemNotes.value = item?.notes || "";
  els.packDialogTitle.textContent = item ? "Edit packing item" : "Add packing item";
  els.packDialogEyebrow.textContent = item ? "Packing item" : "Packing list";
  els.deletePackItemButton.style.visibility = item ? "visible" : "hidden";
  els.packItemDialog.showModal();
}

export function closePackItemDialog() {
  els.packItemDialog?.close();
}

export function savePackItemFromForm(event) {
  event.preventDefault();
  const id = els.packItemId.value || createId();
  const existing = (state.trip.packItems || []).find((item) => item.id === id);
  const groupItems = getPackGroupItems(els.packItemCategory.value, els.packItemSubCategory.value).filter((item) => item.id !== id);
  const packItem = normalizePackItem({
    ...(existing || {}),
    id,
    title: els.packItemTitle.value,
    categoryId: els.packItemCategory.value,
    subCategoryId: els.packItemSubCategory.value,
    status: els.packItemStatus.value,
    quantity: els.packItemQuantity.value,
    tags: getSelectedPackTags(),
    bagId: els.packItemBag.value,
    cost: els.packItemCost.value,
    currency: els.packItemCurrency.value,
    notes: els.packItemNotes.value,
    order: existing ? existing.order : groupItems.length,
    updatedAt: new Date().toISOString(),
  });
  if (!packItem.title) return;
  if (existing) {
    state.trip.packItems = (state.trip.packItems || []).map((item) => (item.id === id ? packItem : item));
  } else {
    state.trip.packItems = [...(state.trip.packItems || []), packItem];
  }
  renumberPackItems();
  state.trip.updatedAt = new Date().toISOString();
  closePackItemDialog();
  render();
}

export function deleteCurrentPackItem() {
  const id = els.packItemId?.value;
  if (!id) return;
  state.trip.packItems = (state.trip.packItems || []).filter((item) => item.id !== id);
  renumberPackItems();
  state.trip.updatedAt = new Date().toISOString();
  closePackItemDialog();
  render();
}

export function cyclePackItemStatus(id) {
  const item = (state.trip.packItems || []).find((entry) => entry.id === id);
  if (!item) return;
  const currentIndex = PACK_STATUSES.indexOf(item.status);
  item.status = PACK_STATUSES[(currentIndex + 1) % PACK_STATUSES.length];
  item.updatedAt = new Date().toISOString();
  state.trip.updatedAt = item.updatedAt;
  render();
}

export function addBag(values = {}) {
  const nextOrder = Math.max(-1, ...(state.trip.bags || []).map((bag) => Number(bag.order) || 0)) + 1;
  const bag = normalizeBag({
    id: createId(),
    label: values.label || `Bag ${nextOrder + 1}`,
    size: values.size || "carry-on",
    weightLimit: values.weightLimit || "",
    color: values.color || "#4d7c8a",
    order: nextOrder,
  });
  if (!bag.label) return;
  state.trip.bags = [...(state.trip.bags || []), bag];
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function updateBag(id, patch) {
  state.trip.bags = (state.trip.bags || []).map((bag) =>
    bag.id === id
      ? normalizeBag({
          ...bag,
          ...patch,
          id: bag.id,
          order: bag.order,
        })
      : bag,
  );
  state.trip.updatedAt = new Date().toISOString();
}

export function deleteBag(id) {
  const bag = (state.trip.bags || []).find((entry) => entry.id === id);
  if (!bag) return;
  const affectedCount = (state.trip.packItems || []).filter((item) => item.bagId === id).length;
  if (affectedCount && !window.confirm(`Delete "${bag.label}"?\n\n${affectedCount} packing item${affectedCount === 1 ? "" : "s"} will become unassigned.`)) return;
  state.trip.bags = (state.trip.bags || [])
    .filter((entry) => entry.id !== id)
    .map((entry, index) => ({ ...entry, order: index }));
  state.trip.packItems = (state.trip.packItems || []).map((item) => (item.bagId === id ? { ...item, bagId: "", updatedAt: new Date().toISOString() } : item));
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function movePackItemToBag(id, bagId) {
  state.trip.packItems = (state.trip.packItems || []).map((item) =>
    item.id === id
      ? {
          ...item,
          bagId: bagId || "",
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function addPackCategory(values = {}) {
  const nextOrder = Math.max(-1, ...(state.trip.packCategories || []).map((category) => Number(category.order) || 0)) + 1;
  const normalized = normalizePackCategories([
    ...getOrderedPackCategories(),
    {
      id: createId(),
      label: values.label || `Category ${nextOrder + 1}`,
      icon: values.icon || "\u{1F4E6}",
      order: nextOrder,
      subcategories: [],
    },
  ]);
  state.trip.packCategories = normalized;
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function updatePackCategory(id, patch) {
  state.trip.packCategories = (state.trip.packCategories || []).map((category) =>
    category.id === id
      ? {
          ...category,
          ...patch,
        }
      : category,
  );
  state.trip.updatedAt = new Date().toISOString();
}

export function deletePackCategory(id) {
  const category = (state.trip.packCategories || []).find((entry) => entry.id === id);
  if (!category) return;
  const affectedCount = (state.trip.packItems || []).filter((item) => item.categoryId === id).length;
  if (affectedCount && !window.confirm(`Delete "${category.label}"?\n\n${affectedCount} packing item${affectedCount === 1 ? "" : "s"} will move to General.`)) return;
  state.trip.packCategories = (state.trip.packCategories || [])
    .filter((entry) => entry.id !== id)
    .map((entry, index) => ({ ...entry, order: index }));
  state.trip.packItems = (state.trip.packItems || []).map((item) =>
    item.categoryId === id
      ? {
          ...item,
          categoryId: state.trip.packCategories[0]?.id || "",
          subCategoryId: "",
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
  state.trip.updatedAt = new Date().toISOString();
  render();
}

export function bindBagPlannerDragAndDrop() {
  els.packingView?.querySelectorAll("[data-pack-chip-id]").forEach((chip) => {
    chip.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", chip.dataset.packChipId);
    });
  });
  els.packingView?.querySelectorAll("[data-bag-drop-zone]").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      movePackItemToBag(event.dataTransfer.getData("text/plain"), column.dataset.bagDropZone || "");
    });
  });
}

export function bindPackingActions(container) {
  container.querySelectorAll("[data-packing-subview]").forEach((button) => {
    button.addEventListener("click", () => {
      state.packingSubView = button.dataset.packingSubview;
      render();
    });
  });

  container.querySelectorAll("[data-pack-action='open-new-item']").forEach((button) => {
    button.addEventListener("click", () => openPackItemDialog());
  });

  container.querySelectorAll("[data-pack-action='edit']").forEach((button) => {
    button.addEventListener("click", () => openPackItemDialog(button.dataset.id));
  });

  container.querySelectorAll("[data-pack-action='delete']").forEach((button) => {
    button.addEventListener("click", () => {
      state.trip.packItems = (state.trip.packItems || []).filter((item) => item.id !== button.dataset.id);
      renumberPackItems();
      state.trip.updatedAt = new Date().toISOString();
      render();
    });
  });

  container.querySelectorAll("[data-pack-action='cycle-status']").forEach((button) => {
    button.addEventListener("click", () => cyclePackItemStatus(button.dataset.id));
  });

  container.querySelectorAll("[data-pack-inline-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const id = addInlinePackItem(form.dataset.id, form.elements.title.value, form.elements.subCategoryId.value);
      form.reset();
      if (id) openPackItemDialog(id);
    });
  });

  container.querySelectorAll("[data-bag-quick-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addBag({
        label: form.elements.label.value,
        size: form.elements.size.value,
        weightLimit: form.elements.weightLimit.value,
      });
    });
  });

  container.querySelectorAll("[data-pack-action='add-bag']").forEach((button) => {
    button.addEventListener("click", () => addBag());
  });

  container.querySelectorAll("[data-bag-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "input" : "change";
    field.addEventListener(eventName, () => {
      updateBag(field.dataset.id, { [field.dataset.bagField]: field.value });
      render();
    });
  });

  container.querySelectorAll("[data-pack-action='delete-bag']").forEach((button) => {
    button.addEventListener("click", () => deleteBag(button.dataset.id));
  });

  container.querySelectorAll("[data-bag-row]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.bagRow);
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      reorderBag(event.dataTransfer.getData("text/plain"), row.dataset.bagRow, getGroupDropPosition(event, row));
    });
  });

  container.querySelectorAll("[data-pack-action='add-category']").forEach((button) => {
    button.addEventListener("click", () => addPackCategory());
  });

  container.querySelectorAll("[data-pack-category-field]").forEach((field) => {
    const eventName = field.dataset.packCategoryField === "icon" ? "input" : "change";
    field.addEventListener(eventName, () => {
      updatePackCategory(field.dataset.id, { [field.dataset.packCategoryField]: field.value.trim() });
      if (field.dataset.packCategoryField !== "icon") render();
    });
  });

  container.querySelectorAll("[data-pack-action='delete-category']").forEach((button) => {
    button.addEventListener("click", () => deletePackCategory(button.dataset.id));
  });

  container.querySelectorAll("[data-pack-category-row]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.packCategoryRow);
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      reorderPackCategory(event.dataTransfer.getData("text/plain"), row.dataset.packCategoryRow, getGroupDropPosition(event, row));
    });
  });

  container.querySelectorAll("[data-pack-subcategory-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addPackSubcategory(form.dataset.id, form.elements.label.value);
      form.reset();
    });
  });

  container.querySelectorAll("[data-pack-subcategory-field]").forEach((field) => {
    field.addEventListener("change", () => {
      updatePackSubcategory(field.dataset.packCategoryId, field.dataset.id, { label: field.value.trim() });
      render();
    });
  });

  container.querySelectorAll("[data-pack-action='delete-subcategory']").forEach((button) => {
    button.addEventListener("click", () => deletePackSubcategory(button.dataset.packCategoryId, button.dataset.id));
  });

  container.querySelectorAll("[data-pack-subcategory-row]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.packSubcategoryRow);
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      reorderPackSubcategory(row.dataset.packCategoryId, event.dataTransfer.getData("text/plain"), row.dataset.packSubcategoryRow, getGroupDropPosition(event, row));
    });
  });

  container.querySelectorAll("[data-pack-item-id]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.packItemId);
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      reorderPackItem(
        event.dataTransfer.getData("text/plain"),
        row.dataset.packItemId,
        row.dataset.packCategoryId,
        row.dataset.packSubcategoryId,
        getGroupDropPosition(event, row),
      );
    });
  });
}

export { syncPackItemSubcategoryOptions };
