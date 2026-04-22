# Trip Planner

A local-first personal trip planning web app for organizing itinerary plans, checklist todos, warnings, and costs in one place.

## Run

Open `index.html` in a browser.

No install step is required. Trip data is saved in browser `localStorage`, and trips can be exported/imported as JSON.

## Current Features

- Saved Trips workspace for planning multiple trips
- Create, open, reset, and delete trips
- Typed safety checks for destructive actions:
  - `Reset data` requires typing `RESET`
  - `Delete` requires typing `DELETE`
- Calendar view, List view, Day detail view, Costs view, and Controls view
- Add, edit, copy, delete, and review itinerary items
- Calendar drag-and-drop to move an item's start date while preserving its time and multi-day span
- Multi-select filters for Type and Status with explicit expand/collapse buttons, plus Search
- Item types for Flight, Hotel, Activity, Family Visit, Meal, Transit, Rest, Reminder, Lesson, and Custom
- Flight items track departure city, arrival city, airline, and confirmation instead of a generic location
- Per-trip color controls for every item type, with color picker or direct hex input
- Calendar, List, Day, and Selected Day cards all use the same trip-specific item type colors
- Fixed timezone choices: US EST, US CDT, and Beijing Time
- Per-item start and end date-time timezones
- Start/end date-time can be fully TBD, or only the time can be TBD while keeping the date
- Compact itinerary times, with timezone labels hidden when every item on the same day uses the same timezone
- Status icons for Idea, Planned, Booked, Confirmed, Done, and Skipped
- Planning warnings for overlaps, missing locations, tight transitions, lodging gaps, and TBD date/time data
- Warnings panel in the sidebar under Planning Todos:
  - collapsed by default
  - shows total warning count
  - expands to list all warnings
- Selected Day sidebar panel with day-specific items and warning count
- Trip-wide Planning Todos checklist in the sidebar:
  - parent todos and nested subtodos
  - expand/collapse per parent todo
  - drag-to-reorder for parent todos and subtodos
  - inline edit by clicking todo text
  - delete and check/uncheck for both levels
  - parent todo can only be checked when all subtodos are completed
  - collapsed parents show child count
- Optional cost tracking on itinerary items, parent todos, and subtodos
- Costs page with:
  - total tracked summary
  - travel cost breakdown
  - checklist todo cost breakdown
  - display currency selector
  - editable USD/RMB exchange rate for normalized totals
- Portrait print calendar that can be saved as a PDF from the browser print dialog

## Data and Persistence

- Trips, itinerary items, todo lists, color settings, and cost settings are stored locally in browser `localStorage`
- JSON export/import preserves trip data, including checklist structure, item type colors, and cost settings

## Notes

- `Reset data` clears itinerary items, checklist todos, and trip notes for the current trip while keeping the trip in Saved Trips.
- `Delete` removes the trip from Saved Trips entirely.
- The old top warnings strip was removed; warnings now live in the sidebar warnings panel.
- The Costs page uses the trip's stored display currency and exchange rate instead of live exchange-rate data.
