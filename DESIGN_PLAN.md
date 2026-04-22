# Trip Planning App Design Plan

This document is the current design record for the local-first trip planner implemented in `index.html`, `styles.css`, and `app.js`.

## 1. Product Goal

Build a personal planning app that keeps the full trip picture in one place:

- itinerary items across days and cities
- planning warnings that help catch problems before the trip
- a trip-wide checklist for prep work such as gifts, packing, and errands
- cost tracking across both travel plans and checklist purchases

The app should support both macro review and detailed cleanup:

- Macro: see the trip across weeks, dates, and anchor events.
- Micro: inspect one day, one item, one todo, or one cost breakdown without losing the overall context.

## 2. Current Workspace Model

The app opens to Saved Trips and then into a trip workspace. The trip workspace currently includes:

1. Saved Trips
   - Create, open, reset, and delete trips.
   - Supports multiple locally stored trips.

2. Calendar View
   - Default screen after opening a trip.
   - Shows the trip across calendar weeks.
   - Calendar items are draggable to a different start date.

3. List View
   - Chronological itinerary grouped by date.
   - Good for practical review of reservations, notes, and timing.

4. Day Detail View
   - Focuses on one selected day.
   - Shows the day's items in order and surfaces day-specific warnings.

5. Costs View
   - Aggregates travel-plan costs and checklist costs.
   - Supports currency normalization into the user's selected display currency.

6. Controls View
   - Lets the user customize trip-specific item type colors.

7. Right Sidebar
   - Selected Day panel
   - Planning Todos panel
   - Warnings panel

## 3. Core User Experience

The current flow is:

1. Create or open a saved trip.
2. Land in Calendar View.
3. Add fixed anchors first: flights, lodging, major visits, key appointments.
4. Add flexible items: meals, activities, transit, rest, reminders, lessons.
5. Use the sidebar checklist to track prep work for the whole trip.
6. Review warnings and cost totals as planning gets more detailed.
7. Use List or Day Detail views for practical sequencing and cleanup.
8. Use Controls to tune color coding for easier scanning.

The design intent is direct utility: the first screen should be usable immediately, and editing should stay lightweight.

## 4. Current Feature Scope

Implemented:

- multi-trip local planning
- add, edit, copy, and delete itinerary items
- calendar/list/day/costs/controls views
- trip-wide checklist with nested subtodos
- warnings panel under Planning Todos
- cost tracking for itinerary items, todos, and subtodos
- calendar drag-and-drop for moving an item's start date
- JSON export/import
- print-friendly calendar output
- typed confirmations for destructive actions

Explicitly not in scope right now:

- live booking sync
- email parsing
- collaboration
- mobile native packaging
- live exchange-rate lookup
- automatic Apple Reminders integration

## 5. Information Architecture

### Trip

A trip is the top-level container.

Fields:

- `id`
- `title`
- `startDate`
- `endDate`
- `homeTimezone`
- `notes`
- `itemTypeColors`
- `costSettings`
- `todos`
- `createdAt`
- `updatedAt`

`itemTypeColors` stores a per-trip mapping from item type to hex color. Missing or invalid values fall back to the default palette.

`costSettings` currently stores:

- `displayCurrency`
- `usdToRmbRate`

`todos` stores a trip-wide checklist rather than day-specific tasks.

### Itinerary Item

Each itinerary card in calendar/list/day views is an itinerary item.

Core fields:

- `id`
- `tripId`
- `type`
- `title`
- `startDateTime`
- `endDateTime`
- `startTbd`
- `endTbd`
- `startTimeTbd`
- `endTimeTbd`
- `allDay`
- `startTimezone`
- `endTimezone`
- `city`
- `location`
- `status`
- `notes`
- `confirmationCode`
- `cost`
- `currency`
- `people`
- `createdAt`
- `updatedAt`

Supported currencies are currently:

- `USD`
- `RMB`

Supported statuses are currently:

- `Idea`
- `Planned`
- `Booked`
- `Confirmed`
- `Done`
- `Skipped`

### Todo

Checklist todos are stored at the trip level.

Fields:

- `id`
- `text`
- `checked`
- `order`
- `cost`
- `currency`
- `subtodos`

### Subtodo

Nested subtodos use the same basic structure as parent todos.

Fields:

- `id`
- `text`
- `checked`
- `order`
- `cost`
- `currency`

Behavior rules:

- parent todos can expand/collapse
- parent and child rows can both be dragged to reorder
- text is edited inline by clicking the text
- a parent todo can only be checked when all subtodos are checked

## 6. Item Types and Default Colors

Current supported item types:

- Flight
- Hotel
- Activity
- Family Visit
- Meal
- Transit
- Rest
- Reminder
- Lesson
- Custom

Current default colors:

- Flight: `#b84a4a`
- Hotel: `#2563eb`
- Activity: `#2f6f73`
- Family Visit: `#4d7c8a`
- Meal: `#7c3aed`
- Transit: `#b88a2d`
- Rest: `#16a34a`
- Reminder: `#2f6f73`
- Lesson: `#8b5e34`
- Custom: `#2f6f73`

These colors are user-editable per trip in Controls.

## 7. View Design

### Visual Direction

The app aims for:

- clean, calm planning surfaces
- high information density without looking cramped
- semantic color coding that helps scanning
- small, obvious controls instead of hidden gestures where possible

The palette still centers on white surfaces, soft gray backgrounds, teal primary actions, and semantic item-type stripes.

### Calendar View

Purpose:

- Review the trip across dates.
- Spot density, conflicts, and missing structure.

Current behavior:

- Shows trip items in calendar cells.
- Supports drag-and-drop of calendar items onto a different day.
- Keeps the original time and preserves multi-day span length.
- Uses trip-specific item type colors.
- Hides the old top warnings strip.

### List View

Purpose:

- Review the trip as a practical itinerary.

Current behavior:

- Groups items by date.
- Uses the same item-type color coding as Calendar View and Controls.
- Warning styling no longer overrides the item-type stripe color.

### Day Detail View

Purpose:

- Inspect one day closely.

Current behavior:

- Shows day-specific items in order.
- Surfaces day warnings inline.
- Works with the Selected Day sidebar context.

### Selected Day Sidebar Panel

Purpose:

- Keep the currently selected day visible while navigating the trip.

Current behavior:

- shows the selected date and city
- shows item count and warning count
- lists that day's itinerary cards

### Planning Todos Sidebar Panel

Purpose:

- Track trip prep work that is not tied to a specific date.

Current behavior:

- trip-wide checklist under Selected Day
- add parent todos
- add nested subtodos
- drag-to-reorder parent and child items
- inline edit by clicking text
- optional cost and currency on parent and child items
- collapsed parent rows show child count

### Warnings Sidebar Panel

Purpose:

- Keep warnings accessible without taking over the main views.

Current behavior:

- lives below Planning Todos
- collapsed by default
- shows total warning count when collapsed
- expands to reveal the full warning list

### Costs View

Purpose:

- Roll up spending tracked during planning.

Current behavior:

- summary cards for total tracked, travel plans, and checklist todos
- detailed Travel costs section
- detailed Checklist costs section
- color-coded summaries and lighter matching section backgrounds
- display currency selector
- editable USD/RMB exchange rate
- normalized totals and row display in the selected currency

### Controls View

Purpose:

- Let users tune scanning colors without editing each item manually.

Current behavior:

- one row per item type
- color picker and hex input
- changes apply immediately to calendar, list, day, and selected day cards

## 8. Filters and Search

Current filter behavior:

- Type and Status support multi-select filtering
- both filters have explicit expand/collapse buttons
- selected values use a light teal pill treatment
- Search aligns visually with the Type and Status controls

This design favors clarity over hover-only behavior.

## 9. Planning Intelligence

Current warnings include:

- overlapping timed items
- missing locations for relevant items
- tight transitions
- lodging gaps
- fully TBD or time-only TBD date/time fields

Warnings are meant to guide planning, not block saving.

## 10. Editing Model

Current editing principles:

- allow incomplete ideas to exist
- keep warnings non-blocking
- use inline editing where it feels lighter than modal-heavy editing
- keep drag-and-drop only where it is intuitive and stable

Examples already implemented:

- click-to-edit todo text
- drag-and-drop calendar date changes
- drag-and-drop todo ordering

## 11. Data Storage

The current implementation is local-first.

Current storage model:

- browser `localStorage`
- JSON export/import for backup and transfer

Export/import should preserve:

- itinerary items
- todo hierarchy
- todo ordering
- item type colors
- cost settings

## 12. Safety and Destructive Actions

To reduce accidental data loss:

- `Reset data` requires typing `RESET`
- `Delete` trip requires typing `DELETE`

These confirmations are intentionally stronger than a simple click-through warning.

## 13. Tech Direction

The current implementation remains intentionally simple:

- `index.html` for structure
- `styles.css` for layout, visual styling, filters, checklist, and print rules
- `app.js` for state, rendering, persistence, warnings, drag-and-drop, filters, costs, and controls

This keeps the app easy to inspect and edit while the interaction model is still evolving.

## 14. Next Useful Enhancements

Likely future improvements:

- richer budgeting summaries beyond total tracked
- optional export formats for checklist data
- better mobile ergonomics for dense planning screens
- more calendar editing controls beyond moving start date
- optional integrations after the local workflow feels stable
