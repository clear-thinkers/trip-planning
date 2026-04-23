# Mobile UI Implementation Plan
_Trip Planner PWA — April 2026_

---

## Overview

This plan addresses all mobile UI issues identified during the audit. Issues are grouped by implementation area and ordered by dependency (global fixes first, then per-view). Each task includes the affected files and specific implementation instructions.

---

## PHASE 1 — Global Fixes
_Apply once, affects all views_

### 1.1 Fix date input overflow
**Issue #1**
- **File:** `styles.css`
- **Fix:** Ensure all `input[type="date"]`, `input[type="text"]`, `select`, and form fields have:
```css
width: 100%;
box-sizing: border-box;
```
- Audit for any fixed `px` widths on form inputs and replace with `width: 100%`

---

### 1.2 Fix navigation tab bar clipping
**Issue #2**
- **File:** `styles.css`
- **Fix:** On mobile, the nav tab row should scroll horizontally:
```css
@media (max-width: 768px) {
  .nav-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
    flex-wrap: nowrap;
  }
}
```

---

### 1.3 Remove "Selected Day" panel globally
**Issues #4, #7, #8**
- **Files:** `render-views.js` (or wherever the Selected Day panel is rendered)
- **Fix:** Remove the Selected Day panel from rendering in **all three views**: Calendar, List, and Day Detail
- On mobile this section is fully replaced by the Add / Review inline day actions (see Phase 2)
- If desktop needs it retained, wrap removal in a mobile media check or a JS `isMobile()` guard

---

## PHASE 2 — Calendar & List View

### 2.1 Mobile calendar → week-by-week grouped list
**Issue #3**
- **Files:** `render-views.js`, `styles.css`
- **Fix:** On mobile (`window.innerWidth < 768`), replace the calendar grid render with a grouped list:
  - Group items by ISO week, week starts **Monday**
  - Section header format: `"Week of [Mon Date]"` e.g. _"Week of Jun 9"_
  - Within each week, sub-group by day with day headers
  - Desktop grid render unchanged
- **Implementation pattern:**
```javascript
function getWeekStartMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}
// Group items → weeks → days → render
```

---

### 2.2 Day tap actions: Add and Review
**Issues #4, #5**
- **Files:** `render-views.js`, `init.js`
- **Fix:** When user taps a day in Calendar or List view, show two inline action buttons on that day row/cell:
  - **Add** → opens the Add Item form pre-filled with that date
  - **Review** → navigates to Day Detail view for that date
- Remove all Selected Day panel render calls from these views (see 1.3)

---

## PHASE 3 — Day Detail View

### 3.1 Increase margin between warnings and itinerary
**Issue #6**
- **File:** `styles.css`
- **Fix:** Add spacing after the warnings section before the first time-group heading:
```css
@media (max-width: 768px) {
  .warnings-section + .time-group,
  .warning-list + .itinerary-items {
    margin-top: 24px;
  }
}
```
_(Adjust selectors to match actual class names in codebase)_

---

## PHASE 4 — Planning Todos View

### 4.1 Collapse itinerary section by default
**Issue #9**
- **Files:** `render-views.js`, `styles.css`
- **Fix:** Wrap the itinerary/calendar section inside Planning Todos in a `<details>` element:
```html
<details id="todos-itinerary-section">
  <summary>Itinerary <span class="badge">N items</span></summary>
  <!-- itinerary content -->
</details>
```
- Default: `open` attribute **not set** (collapsed on load)
- Show item count badge in summary so user knows content exists

---

### 4.2 Week-by-week view inside collapsible itinerary
**Issue #10**
- **Files:** `render-views.js`
- **Fix:** When expanded, render the same week-by-week grouped list from Issue #3 (reuse the same render function)

---

### 4.3 Fix todo item text overflow
**Issue #11**
- **File:** `styles.css`
- **Fix:** Restructure the todo item row layout:
```css
.todo-item {
  display: grid;
  grid-template-columns: 24px 24px 1fr auto;
  /* drag-handle | checkbox | text-block | delete-btn */
  align-items: start;
  gap: 8px;
}
.todo-text-block {
  flex: 1;
  min-width: 0; /* critical for text wrapping */
}
.todo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
```

---

### 4.4 Replace DRAG label with icon handle
**Issues #12, #13**
- **Files:** `render-views.js`, `styles.css`
- **Fix:**
  - Replace `<span>DRAG</span>` with `<span class="drag-handle">⠿</span>` (or `≡`)
  - Style it as a small muted icon, minimum touch target 44px height
  - Hide the text label entirely

---

### 4.5 Make delete (X) button smaller
**Issue #14**
- **File:** `styles.css`
- **Fix:**
```css
.todo-delete-btn {
  font-size: 12px;
  padding: 2px 6px;
  opacity: 0.5;
  min-width: unset;
}
```

---

### 4.6 Fix drag-to-reorder for touch devices
**Issue #12**
- **File:** `init.js` or wherever drag events are bound
- **Fix:** Add touch event support alongside existing mouse events:
```javascript
el.addEventListener('touchstart', onDragStart, { passive: false });
el.addEventListener('touchmove', onDragMove, { passive: false });
el.addEventListener('touchend', onDragEnd);
```
- Map `touch.touches[0].clientY` to replicate mouse Y position
- Or replace current drag implementation with a lightweight touch-compatible library such as **Sortable.js** (free, no framework required):
```html
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
```

---

## PHASE 5 — Costs View

### 5.1 Stack summary cards on mobile
**Issue #15**
- **File:** `styles.css`
- **Fix:**
```css
@media (max-width: 768px) {
  .cost-summary-cards {
    display: grid;
    grid-template-columns: 1fr 1fr; /* 2x2 grid */
    gap: 12px;
  }
}
```

---

### 5.2 Stack cost detail sections vertically
**Issue #16**
- **File:** `styles.css`
- **Fix:** On mobile, cost detail columns (Travel / Checklist / Packing) should be full-width vertical stack:
```css
@media (max-width: 768px) {
  .cost-sections {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .cost-section {
    width: 100%;
  }
}
```

---

### 5.3 Fix cost item text wrapping
**Issue #17**
- **File:** `styles.css`
- **Fix:** Cost item rows should use flex with natural text wrapping:
```css
.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.cost-item-title {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}
.cost-item-amount {
  white-space: nowrap;
  text-align: right;
}
```
- Remove any fixed `px` widths or `overflow: hidden` on cost item columns

---

### 5.4 Prevent cost amount truncation
**Issue #18**
- **File:** `styles.css`
- **Fix:** Amounts must never clip. Ensure:
  - `white-space: nowrap` on amount elements
  - Amount column has enough min-width (`min-width: 80px`)
  - No `overflow: hidden` or `text-overflow: ellipsis` on amount cells

---

## Implementation Order

| Priority | Phase | Issues |
|----------|-------|--------|
| 1 | Global: input overflow + nav tabs | #1, #2 |
| 2 | Global: remove Selected Day panel | #4, #7, #8 |
| 3 | Costs view full restructure | #15–18 |
| 4 | Todo item row layout + DRAG/X fixes | #11, #13, #14 |
| 5 | Todo touch drag | #12 |
| 6 | Calendar/List week grouping | #3 |
| 7 | Day tap Add/Review actions | #5 |
| 8 | Day Detail warning margin | #6 |
| 9 | Planning Todos collapsible itinerary | #9, #10 |

---

## Notes for Agent

- All CSS changes should be wrapped in `@media (max-width: 768px)` unless the fix is clearly safe globally (e.g. `box-sizing`, `min-width: 0` on flex children)
- Do not alter desktop layout — mobile-only overrides only
- Test each phase on iPhone viewport (390×844) in browser DevTools before moving to next
- The week-by-week grouping function (Issue #3) should be written once and reused in both Calendar view and Planning Todos expanded section
