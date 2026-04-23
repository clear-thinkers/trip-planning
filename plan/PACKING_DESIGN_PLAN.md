# Packing Planner — Design Plan

## 1. Overview

The Packing Planner adds a dedicated workspace for planning, purchasing, and packing every item a traveler needs for a trip. It integrates cleanly with the existing trip workspace by following the same tab, sidebar, and card conventions already in use.

Three functional areas make up the feature:

1. **Packing List** — a category-organized checklist for tracking every item through its lifecycle from idea to packed.
2. **Bag Planner** — a visual drag-and-drop canvas where items are placed inside shapes representing physical bags.
3. **Packing Controls** — a controls section (extending the existing Controls tab) where users manage categories and bags.

Cost data entered on packing items surfaces in the existing Costs page as a new "Packing" cost group alongside Travel plans and Checklist todos.

---

## 2. How It Fits Into the Current UI

### New Tab

A **Packing** tab is added to the existing `view-tabs` nav bar, placed between "Costs" and "Controls":

```
Calendar | List | Day detail | Packing | Costs | Controls
```

The corresponding view panel `#packingView` follows the same `.view-panel` convention and becomes active when the tab is selected.

### Controls Tab Extension

The existing Controls tab gains a second section below "Item type colors" titled **Packing setup**. This section manages bag definitions and category/sub-category trees. No new top-level tab is needed.

### Costs Page Extension

The Costs view gains a third cost breakdown column: **Packing costs**, which aggregates costs across all packing items with a cost value set. The existing `cost-breakdown-grid` expands from two columns to three, and the `cost-summary-grid` card row gains a fourth card: "Packing items."

### Sidebar

The sidebar's Selected Day panel is unaffected (packing is trip-wide, not date-bound). No sidebar changes are required.

---

## 3. Data Model

### 3.1 New Trip-Level Fields

Two new arrays are added to the trip object alongside `todos` and `items`:

```
trip.packCategories   — array of PackCategory
trip.packItems        — array of PackItem
trip.bags             — array of Bag
```

These are normalized on `normalizeTrip()` and preserved on export/import.

### 3.2 PackCategory

A two-level category tree. Top-level categories hold sub-categories. Sub-categories are inline; there is no third nesting level.

```
{
  id:           string
  label:        string            — display name, e.g. "Clothing"
  icon:         string            — single emoji or short token, e.g. "👕"
  order:        number
  subcategories: [
    {
      id:     string
      label:  string              — e.g. "Underwear"
      order:  number
    }
  ]
}
```

Items may be assigned to a top-level category only (no sub-category selected), or to a specific sub-category.

### 3.3 PackItem

```
{
  id:              string
  title:           string
  categoryId:      string         — references PackCategory.id
  subCategoryId:   string | ""    — references subcategory id, optional
  status:          "Idea" | "Purchased" | "Packed"
  quantity:        number         — default 1
  person:          string         — optional, e.g. "Freddie"
  bagId:           string | ""    — which Bag this item is assigned to
  cost:            string         — matches existing cost normalization
  currency:        "USD" | "RMB"
  notes:           string
  order:           number         — within its category/subcategory group
  createdAt:       string
  updatedAt:       string
}
```

### 3.4 Bag

```
{
  id:          string
  label:       string             — e.g. "Freddie's backpack"
  size:        "personal" | "carry-on" | "checked-small" | "checked-large" | "custom"
  weightLimit: string             — optional, kg
  color:       string             — hex color used as visual accent in Bag Planner
  order:       number
}
```

---

## 4. Default Categories

When a new trip is created, `packCategories` is seeded with the following defaults. Users may rename, reorder, add, or delete entries in Packing Controls.

| Top-level     | Default sub-categories                                     |
|---------------|------------------------------------------------------------|
| Clothing 👕   | Tops, Bottoms, Underwear, Socks, Outerwear, Shoes, Accessories |
| Toiletries 🧴 | Skincare, Hair Care, Medicine, Personal Care               |
| Electronics 🔌| Devices, Cables & Adapters, Entertainment                  |
| Documents 📄  | Passport & ID, Travel Docs, Money & Cards                  |
| Food 🍎       | Airplane Snacks, Kids Snacks, Meals & Supplies             |
| Kids 🧸       | Nora, Freddie, Toys, Activities                            |
| Gifts 🎁      | *(no sub-categories by default)*                           |
| Misc 📦       | *(no sub-categories by default)*                           |

---

## 5. Item Statuses

Three statuses map the packing lifecycle:

| Status     | Meaning                                | Visual treatment                   |
|------------|----------------------------------------|------------------------------------|
| Idea       | Considering adding; not yet purchased  | Muted gray pill (matches existing) |
| Purchased  | Bought; not yet packed                 | Amber pill (matches existing booked style) |
| Packed     | In a bag; ready to go                  | Green pill (matches existing confirmed/done style) |

A status icon approach mirrors the existing `STATUS_ICONS` pattern. A progress bar at the top of the Packing view shows: `X of Y items packed`.

---

## 6. Packing View Layout

The Packing view is divided into two sub-views toggled by a compact internal nav (not new tabs — small toggle buttons within the view panel):

```
[ Packing list ]  [ Bag planner ]
```

This keeps the main tab bar clean and groups both packing-related surfaces under a single tab.

### 6.1 Packing List Sub-View

**Header row:**
- Title: "Packing list"
- Progress bar: `Packed: X / Y items` with three-segment fill (Idea / Purchased / Packed)
- "Add item" button (opens an item dialog, same modal pattern as itinerary items)

**Category sections:**

Each top-level category renders as a `section-block` with:
- Category icon + label as the section header
- Item count badge and a packed-count badge
- A "Collapse/Expand" toggle (default: expanded)

Within each category, items are grouped by sub-category. Sub-category labels appear as lightweight inline dividers (not full section-blocks). Items with no sub-category appear first under a "General" label.

**Item row:**

Each item renders as a compact row (similar to a `todo-item`) with:
- Status toggle: clicking the status badge cycles Idea → Purchased → Packed → Idea
- Item title (click to open edit dialog)
- Quantity badge if > 1: e.g. `×3`
- Person badge if assigned: e.g. `Freddie`
- Cost badge if set
- Bag badge if assigned (shows bag label in the bag's accent color)
- Delete button

Items are draggable within and across sub-category groups to reorder.

**Add item flow:**

A compact inline "Add item" form appears at the bottom of each category (similar to the subtodo add form). It captures title and optionally sub-category. A full edit dialog captures all fields.

### 6.2 Bag Planner Sub-View

**Purpose:** Let the user visually distribute items across physical bags and get a sense of load distribution before packing.

**Layout:**

The canvas is a horizontal row of bag "columns". Each column represents one defined bag. An "Unassigned" column on the left holds all items not yet assigned to a bag.

Each bag column:
- Header: bag label, size label (e.g. "Carry-on"), color accent stripe matching the bag's color, weight limit if set
- Item slots: items assigned to that bag appear as compact chips (title + person if set + packed status dot)
- Drop zone: entire column is a valid drop target; items drag from any column to any other
- Item count and an optional total cost for that bag

**Item chips:**

Small pills showing:
- Status dot (color-coded: gray / amber / green)
- Item title (truncated)
- Person tag if set

**Packing progress per bag:**

A thin progress bar at the bottom of each bag column shows the proportion of its items that are Packed.

**Bag management:**

An "Add bag" button (inside the Bag Planner header) opens a simple form to define a new bag. Bags can also be managed in Packing Controls.

---

## 7. Packing Controls (within Controls Tab)

A new `section-block` below "Item type colors" titled **Packing setup** with two sub-sections:

### 7.1 Bags

- One row per bag: label, size selector, weight limit input, color picker, delete button
- "Add bag" button at the bottom
- Drag-to-reorder rows

Bag colors are used in the Bag Planner column headers and as the bag badge accent color on item rows in the Packing List.

### 7.2 Categories

- Accordion-style rows, one per top-level category
- Each expands to reveal its sub-category list
- Inline rename for category and sub-category labels
- "Add sub-category" form per category
- Delete button per category and per sub-category (with a warning if items are assigned)
- "Add category" button at the bottom of the section
- Drag-to-reorder top-level categories and sub-categories within a category
- Emoji/icon field for each top-level category

---

## 8. Cost Integration

### Packing cost entries

`getPackingCostEntries()` mirrors `getTravelCostEntries()` and `getTodoCostEntries()`. It returns one entry per packing item that has a non-empty cost value.

Entry shape:
```
{
  title:    item.title,
  meta:     `${categoryLabel} - ${subCategoryLabel || "General"} - ${item.person || ""}`,
  cost:     item.cost,
  currency: item.currency,
  source:   "packing"
}
```

### Costs view changes

1. **Summary row** gains a fourth card: "Packing items" with teal-adjacent styling (suggest a soft rose background: `#fff5f5`, border `rgba(184, 74, 74, 0.22)`) to distinguish it from the three existing cards without introducing a new color token.

2. **Breakdown grid** gains a third column: "Packing costs" with a matching light background.

3. The "Total tracked" summary card includes packing costs in its total.

The existing `formatCostTotals()` and `convertCost()` functions are reused without modification.

---

## 9. Item Dialog (Add / Edit Pack Item)

Reuses the same `<dialog>` pattern as the itinerary item dialog. A second dialog element `#packItemDialog` is added with the following fields:

| Field         | Input type              | Notes                                    |
|---------------|-------------------------|------------------------------------------|
| Title         | text (required)         |                                          |
| Category      | select                  | Populated from `packCategories`          |
| Sub-category  | select                  | Filtered by selected category            |
| Status        | select (3 options)      | Idea / Purchased / Packed                |
| Quantity      | number (min 1)          | Default 1                                |
| Person        | select (from trip people) | Optional; same people list as items    |
| Bag           | select                  | Populated from `bags`; optional          |
| Cost          | number + currency       | Same cost-input-row as itinerary items   |
| Notes         | textarea                |                                          |

Dialog actions: Delete (if editing), Cancel, Save item.

---

## 10. State Changes

Two additions to the existing `state` object:

```
state.packingSubView   = "list" | "planner"   // toggles within the Packing tab
state.packingFilters   = {
  status: ["all"],    // mirrors existing filter pattern
  category: ["all"],
  search: ""
}
```

The existing `render()` function's `viewRenderers` dispatch table gains one new entry:

```js
const viewRenderers = {
  calendar: renderCalendar,
  list:     renderList,
  day:      renderDayView,
  costs:    renderCosts,
  packing:  renderPacking,       // ← new
  controls: renderControls,
};
```

`renderControls()` calls `renderPackingControls()` at the end of its body to append the Packing setup section.

---

## 11. Export / Import

`exportTrip()` already exports the full trip object. No changes needed — `packCategories`, `packItems`, and `bags` are normalized on import via `normalizeTrip()`, matching how `todos` and `itemTypeColors` are handled today.

---

## 12. Warnings Integration

Two new warning types are added to `getWarnings()`:

| Warning type      | Trigger                                                  |
|-------------------|----------------------------------------------------------|
| Unpacked items    | Trip start is within 3 days and any item is not Packed   |
| Unassigned items  | Bags are defined but some items have no bag assignment   |

These surface in the existing Warnings sidebar panel alongside travel warnings.

---

## 13. Visual Design Notes

All new elements reuse existing design tokens and CSS patterns:

- `section-block`, `section-header`, `badge`, `empty-state` classes are reused unchanged
- Item row layout borrows from `.todo-item` grid structure
- Status badges use the existing `.badge.idea`, `.badge.booked` (for Purchased), and `.badge.confirmed` (for Packed) classes — no new status classes needed
- Bag Planner columns are new layout (horizontal flex, scrollable) but use existing surface/border/shadow tokens
- Item chips in the Bag Planner use the same `.item-pill` base with a narrower variant class `.pack-chip`
- Category accordion in Controls mirrors the existing `type-color-row` structure
- The progress bar is a new lightweight component: a `<div class="pack-progress-bar">` with an inner fill div — styled with existing primary/success/warning colors for the three status segments

---

## 14. Modularization

The packing feature is built alongside a conversion of the codebase to native ES modules. No bundler or build step is required — all modern browsers support `<script type="module">` natively.

### 14.1 index.html change

```html
<!-- before -->
<script src="app.js"></script>

<!-- after -->
<script type="module" src="app.js"></script>
```

### 14.2 Target file structure

```
js/
  constants.js       — ITEM_TYPES, STATUSES, DEFAULT_ITEM_TYPE_COLORS, STATUS_ICONS,
                       TIMEZONES, CURRENCIES, DEFAULT_PEOPLE, DEFAULT_TIMEZONE,
                       DEFAULT_USD_TO_RMB_RATE, STORAGE_KEY,
                       PACK_STATUSES, DEFAULT_PACK_CATEGORIES, BAG_SIZES
  state.js           — state object, loadStore, saveStore, normalizeStore,
                       getActiveTrip, normalizeTrip, normalizeItem, normalizeTodo,
                       normalizeSubtodo, normalizeItemTypeColors, normalizeCostSettings,
                       normalizeHexColor, normalizeTimezone, normalizeCurrency,
                       normalizeCostValue, normalizeExchangeRate,
                       normalizePackCategories, normalizePackItem, normalizeBag,
                       createSampleTrip, sampleItem
  data.js            — eachTripDate, getCalendarDates, filteredItems, getItemsForDate,
                       getTbdItems, getTripTodos, getSubtodos, getPrimaryCity,
                       getTripCities, compareItems, getSortDateTime, itemOccursOnDate,
                       shouldShowTimezoneForItems, getDisplayTimezones,
                       getTravelCostEntries, getTodoCostEntries, getPackingCostEntries,
                       hasCost, getCostSettings, convertCost, formatCostTotals,
                       getPackItemsForCategory, getPackingProgress
  warnings.js        — getWarnings, getWarningsForTrip, getTbdDateTimeWarnings,
                       getOverlapWarnings, getMissingLocationWarnings,
                       getTightTransitionWarnings, getLodgingWarnings,
                       getUnpackedItemWarnings, getUnassignedPackItemWarnings
  format.js          — formatItemTime, formatDateTimePiece, formatDateLong,
                       formatDateShort, formatTime, formatTimezone, formatCost,
                       formatCostAmount, buildDateTimeValue, shiftDateTimeToDate,
                       shiftEndDateTimeToDate, parseLocalDate, toIsoDate,
                       getDatePart, getTimePart, splitList, slugify, createId,
                       escapeHtml, debounce
  render-shared.js   — renderItemTypeStyle, renderStatusIcon, renderTimelineRow,
                       renderCurrencyOptions, getItemMeta, getItemTypeColor,
                       getDefaultItemTypeColor
  render-views.js    — renderCalendar, renderList, renderDayView, renderCosts,
                       renderControls, renderSidePanel and all their helpers
                       (renderTodoItem, renderSubtodoItem, renderCostEntry,
                       renderCostSummaryCard, renderCostBreakdown, renderWarningItem,
                       renderPackingControls, bindCostControls, bindTodoActions,
                       bindWarningsPanel, bindCalendarDayCells,
                       bindCalendarItemDragAndDrop, updateColorControlReadout)
  render-packing.js  — renderPacking, renderPackingList, renderBagPlanner,
                       renderPackItem, renderPackChip, renderBagColumn,
                       renderPackProgressBar, bindPackingActions,
                       bindBagPlannerDragAndDrop, openPackItemDialog,
                       closePackItemDialog, savePackItemFromForm,
                       deleteCurrentPackItem, cyclePackItemStatus,
                       addBag, updateBag, deleteBag, movePackItemToBag,
                       addPackCategory, updatePackCategory, deletePackCategory
  init.js            — cacheElements, populateSelects, bindEvents,
                       populateTimezoneSelect, populatePeopleSelect,
                       updateItemFormForType, updateDateTimeTbdControls,
                       toggleFilterSelect, bindDynamicActions
app.js               — DOMContentLoaded bootstrap, render() orchestrator,
                       imports from all js/ modules
```

### 14.3 Module boundary rules

- `constants.js` has no imports.
- `format.js` imports only from `constants.js`.
- `state.js` imports from `constants.js` and `format.js`.
- `data.js` and `warnings.js` import from `constants.js`, `state.js`, and `format.js`.
- `render-shared.js` imports from `constants.js`, `state.js`, and `format.js`.
- `render-views.js` imports from all of the above.
- `render-packing.js` imports from all of the above.
- `init.js` imports from `constants.js`, `state.js`, `render-shared.js`, and `render-views.js`.
- `app.js` imports `render*` functions from view modules and `init` functions from `init.js`.

All functions that currently reference `state` directly continue to do so — `state` is exported from `state.js` as a named export and imported wherever needed. There is no prop-drilling or dependency injection required.

### 14.4 `els` object

`els` is declared in `init.js`, populated by `cacheElements()`, and exported as a named export. Modules that need to read or write DOM elements import `els` from `init.js`.

---

## 15. Implementation Sequence

Recommended build order. Each step leaves the app in a working state.

1. **Modularize existing code** — convert `app.js` to `<script type="module">`, extract all existing functions into the `js/` modules above (excluding packing functions which don't exist yet), verify the app works identically before any packing code is written.
2. **Data layer** — add `normalizePackCategories()`, `normalizePackItem()`, `normalizeBag()` to `state.js`; add packing constants to `constants.js`; seed defaults in `createSampleTrip()`; add `getPackingCostEntries()` and `getPackItemsForCategory()` to `data.js`; verify export/import round-trip.
3. **Packing Controls** — implement `renderPackingControls()` in `render-packing.js`; wire into `renderControls()`; confirm category and bag data is writable and persists.
4. **Packing List** — implement `renderPackingList()` and `renderPackItem()`; add `#packingView` panel and Packing tab to `index.html`; add `packing: renderPacking` to the `viewRenderers` dispatch table in `app.js`; add pack item dialog to `index.html`; status cycling; item cost badges.
5. **Costs integration** — update `renderCosts()` to include packing cost summary card and breakdown column using `getPackingCostEntries()`.
6. **Bag Planner** — implement `renderBagPlanner()`, bag columns, drag-and-drop via `bindBagPlannerDragAndDrop()`, per-bag progress bars.
7. **Warnings** — add `getUnpackedItemWarnings()` and `getUnassignedPackItemWarnings()` to `warnings.js`; include in `getWarnings()`.

---

## 15. Out of Scope (for This Phase)

- Weight calculation or auto-balance suggestions across bags
- Packing lists shared across trips (each trip has its own list)
- Smart category suggestions based on destination or weather
- Barcode / product lookup for purchased items
- Print view for the packing list (can be added later as a print stylesheet extension)
