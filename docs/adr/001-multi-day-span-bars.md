# ADR 001: Multi-Day Calendar Span Bars

**Date:** 2026-04-28  
**Status:** Accepted

## Context

The calendar view previously showed multi-day items (where `endDate > startDate`) as a repeated pill in every day cell the item spanned. A 5-night hotel stay would appear as 5 separate, identical blocks — one per day — wasting vertical space and obscuring the item's duration.

## Decision

Multi-day items are rendered as a single horizontal span bar that physically crosses column boundaries in the CSS grid, one per week row. Single-day items continue to appear as per-cell pills.

## Design Decisions

### 1. True DOM Spanning (not visual-only connected pills)
The calendar is restructured from a flat 7-column grid of day cells into per-week wrappers. Each `.calendar-week` contains a `.span-layer` (7-column grid where multi-day items span columns via `grid-column: X / Y`) and a `.day-layer` (7-column grid of day cells). CSS grid auto-placement stacks overlapping spans vertically within the span layer.

**Rejected alternative:** Style adjacent day-cell pills to look connected (flat edges). Rejected because the item still occupies a slot in each day's pill stack, bloating the cell and making duration unreadable.

### 2. Multi-Week Spans Use Continuation Segments
When a span crosses a week boundary, it renders as two independent bar segments — one per week row. The second (and further) segments use class `span-bar--continuation` and display a `◄` arrow prefix to indicate the item started in a prior week. If a segment extends past the end of its week, it uses `span-bar--extending` and has a flat right edge.

### 3. Span Bar Content
- **First segment:** status icon + start time (if not allDay/TBD) + title
- **Continuation segment:** `◄` arrow + title only (time omitted; item already shown in prior week)
- Status icon is inline (not absolutely positioned) to fit the bar's limited height

### 4. Drag and Drop: Preserved, Uses Start Date
Span bars carry `data-calendar-drag="true"` and `draggable="true"`. Dropping a span bar onto any day cell calls `moveItemToCalendarDate`, which sets the item's start date to the dropped date and shifts the end date by the same delta (preserving duration). The existing `bindCalendarItemDragAndDrop` binding picks up span bars automatically.

### 5. Item Count Cap
The 4-item cap and "+N more" indicator apply only to single-day items within each day cell. Multi-day items are removed from the per-day pill stacks entirely — they appear only in the span layer. This means the cap is not inflated by long-running background items (e.g., a 2-week hotel).

### 6. Definition of Multi-Day
An item is multi-day when `getDatePart(endDateTime) > getDatePart(startDateTime)`. Items with no `endDateTime`, or where start and end fall on the same calendar date, remain as single-day pills.

## Code Structure

| File | Role |
|------|------|
| `js/calendar-layout.js` | Pure helpers: `isMultiDayItem`, `computeSpanBarsForWeek` — no DOM or state deps, fully testable in Node.js |
| `js/data.js` | Stateful wrappers: `getSingleDayItemsForDate`, `getMultiDaySpansForWeek` (call `filteredItems()` then delegate to calendar-layout) |
| `js/render-views.js` | `renderCalendar` uses week-wrapper structure; new `renderSpanBar` function |
| `styles.css` | `.span-layer`, `.span-bar`, `.span-bar--continuation`, `.span-bar--extending`; print rules updated |
| `tests/calendar-layout.test.mjs` | Unit tests for the pure layout logic |

## Print View
The print layout is preserved. `--print-week-height` now applies to `.day-layer` (was `.calendar-grid`). Span bars render in compact form with reduced font size and border width. The span layer height is content-driven (auto) and taken from the total week height budget; the day layer uses the computed `--print-week-height`.

## Consequences
- Calendar correctly communicates duration of multi-day items at a glance
- Per-day pill stacks are less cluttered for days that fall within a long-running item
- Dragging a span bar moves the entire item (start + preserved duration) to a new start date
- Mobile calendar view is unchanged (it renders the list-style `renderMobileCalendar`)
