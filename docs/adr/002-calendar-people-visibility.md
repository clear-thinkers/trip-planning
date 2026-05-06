# ADR 002: Calendar People Visibility

**Date:** 2026-05-06  
**Status:** Accepted

## Context

Itinerary records can have one or more selected people in `item.people`. Those people are visible in detailed itinerary surfaces, but the desktop calendar view currently prioritizes time, title, and item metadata. This makes it hard to scan the calendar by traveler or confirm who is attached to each record without opening each item.

The requested change is to display all selected people for all records in the calendar view. The same information must also be present in the printed calendar view, because print/PDF output is a primary sharing and review format for the trip.

## Decision

Calendar event rendering should include the full selected-people list for every item that has people assigned.

This applies to:

- Single-day calendar pills in `.day-cell`
- Multi-day span bars in `.span-layer`
- Desktop print/PDF output for both single-day pills and span bars
- Mobile calendar list output, if it is used as the calendar representation at mobile widths or in mobile print contexts

Items with no selected people should not render an empty people row or badge.

## Display Guidance

- Render people from the normalized `item.people` array.
- Preserve the complete list; do not truncate names in the generated text.
- Use the existing comma-separated people format already used by timeline rows unless a compact shared helper is introduced.
- Keep the people display secondary to the item title and time.
- Allow wrapping in print so long names and many selected people remain readable.
- In the interactive desktop calendar, wrapping is acceptable for single-day pills; span bars may use a compact inline label if vertical space is constrained.

## Implementation Plan

### 1. Introduce a reusable people renderer

Create a small helper in `js/render-shared.js`, for example `renderPeopleBadge(item, options = {})`, that:

- Reads `item.people`
- Filters blank values defensively
- Escapes each value
- Returns an empty string when no people are selected
- Supports class customization for calendar-specific styling

Then update `renderTimelineRow` to use the helper so people rendering remains consistent.

### 2. Update desktop calendar markup

In `js/render-views.js`:

- Add the people helper to the existing `render-shared.js` import.
- Include selected people inside each single-day `.item-pill`, after title/meta or after title if the metadata remains hidden in print.
- Include selected people inside `renderSpanBar`.
- Keep `data-action`, drag attributes, status icon, time, and title behavior unchanged.

### 3. Update mobile calendar markup

`renderGroupedItineraryDay` currently renders calendar-style `.item-pill` entries for the mobile calendar/list surface. Add the people helper there too, so calendar behavior is consistent across responsive layouts.

### 4. Add CSS for calendar people display

In `styles.css`:

- Add a small secondary `.item-people` or `.calendar-people` style aligned with `.item-meta`.
- Ensure people text wraps with `overflow-wrap: anywhere`.
- For `.span-bar`, use a compact inline treatment that does not crowd the title or time.
- Verify the people row does not conflict with the absolutely positioned `.status-icon` used by `.item-pill`.

### 5. Add print-specific CSS

Inside `@media print`:

- Ensure calendar people text is visible when `.item-meta` is hidden.
- Use readable print sizing consistent with existing print rules.
- Allow wrapping for single-day pills and mobile print pills.
- Keep span-bar people compact but visible.

### 6. Cover with tests

Add or update focused tests to verify:

- Calendar item markup includes all selected people.
- Items without selected people do not emit empty people markup.
- Print CSS keeps the people selector visible and readable.
- Multi-day span markup includes selected people.

If DOM-level render tests are not already available, use a small Node-based render helper test or add structural CSS assertions to `tests/print-styles.test.mjs` for the print behavior.

## Consequences

- Calendar and print views become more useful for traveler-specific review.
- Dense days may become taller, especially in print, because all selected people must remain visible.
- Span bars may need careful styling to balance complete people visibility with constrained horizontal space.
- A reusable people renderer reduces future drift between timeline, calendar, mobile, and print surfaces.
