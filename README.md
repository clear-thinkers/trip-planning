# Trip Planner

A local-first personal trip planning web app for keeping itinerary plans, planning todos, packing prep, warnings, and costs in one place.

## Run

Start a local server from this folder:

```powershell
node serve-local.mjs
```

Then open the `http://localhost:4173` URL it prints.

Opening `index.html` directly from `file:///...` is no longer reliable because the app is now split into native browser ES modules.

No npm install step is required. Trip data is saved in browser `localStorage`, and trips can be exported/imported as JSON.

If you previously used the app from `file:///...` and your old trips do not appear on `localhost`, open [recover-file-storage.html](recover-file-storage.html) directly in the same browser profile and export the old file-based storage as JSON. Then import that JSON into the localhost app.

## Install on iOS (Add to Home Screen)

The app is a Progressive Web App. When served over HTTPS, it can be installed on an iPhone or iPad:

1. Open the app URL in Safari
2. Tap the Share button
3. Tap **Add to Home Screen**

Once installed, the app loads fully offline from the local cache. All trip data stays on-device in `localStorage`. If a new version is deployed, a banner will appear at the bottom of the screen with a **Refresh now** button.

> Service workers require HTTPS in production. The local `http://localhost` dev server works for testing but the install prompt will not appear until the app is hosted on a real HTTPS domain.

## App Structure

- `app.js` boots the app, coordinates top-level rendering, and registers the service worker
- `js/init.js` caches DOM nodes, populates controls, and binds events
- `js/state.js` normalizes trip data and owns local persistence
- `js/render-views.js` renders trips, itinerary views, planning todos, costs, controls, import/export, and print
- `js/render-packing.js` renders the packing list, bag planner, and packing controls
- `js/data.js`, `js/warnings.js`, `js/format.js`, `js/constants.js`, and `js/render-shared.js` hold shared logic
- `sw.js` service worker — pre-caches all app assets, serves the app offline, and notifies the page when a new version activates
- `manifest.json` PWA manifest — name, icons, and display settings for home screen installation
- `offline.html` fallback page shown when the user is offline and requests an uncached resource
- `brand.svg` local brand image used in the app header

## Current Features

- Saved Trips landing page for creating, opening, resetting, deleting, exporting, and importing trips
- Typed safety checks for destructive actions:
  - `Reset data` requires typing `RESET`
  - `Delete` requires typing `DELETE`
- Reorganized multi-view workspace with `Calendar`, `List`, `Day detail`, `Planning Todos`, `Packing`, `Costs`, and `Controls`
- Calendar, list, and day-detail itinerary planning with add, edit, copy, delete, and drag-to-move support
- Item types for Flight, Hotel, Activity, Family Visit, Meal, Transit, Rest, Reminder, Lesson, and Custom
- Flight-aware itinerary fields for departure city, arrival city, airline, and confirmation code
- Per-item tags, people, links, notes, costs, and per-endpoint timezones
- TBD support for full start/end date-time or just start/end time
- Status icons for `Idea`, `Planned`, `Booked`, `Confirmed`, `Done`, and `Skipped`
- Context-sensitive filters:
  - itinerary views use Type, Status, and Search
  - planning view uses Todo status, Due date, and Search
  - packing view uses Packing status, Tags, and Search
  - costs view uses Price rule, Currency, Amount, and Search
- Selected Day sidebar for calendar/list/day views, with that day's items plus a collapsible warnings panel
- Dedicated Planning Todos view with:
  - parent todos and nested subtodos
  - inline edit and drag-to-reorder
  - due dates and a planning due-date calendar
  - optional cost tracking on both todos and subtodos
  - filtering by done/open state and due-date bucket
- Dedicated Packing workspace with:
  - packing list grouped by category and sub-category
  - statuses `Idea`, `Purchased`, and `Packed`
  - quantity, tags, notes, bag assignment, and optional cost per item
  - bag planner with drag-and-drop item assignment
  - bag setup for size, weight limit, and accent color
  - editable two-level packing category tree in Controls
- Warnings for itinerary issues and packing readiness:
  - TBD date/time data
  - overlaps
  - missing locations
  - tight transitions
  - lodging gaps
  - unpacked items close to trip start
  - unassigned packing items when bags exist
- Costs page with summaries and breakdowns for travel plans, planning todos, and packing items
- Per-trip display currency and editable USD/RMB exchange rate for normalized cost totals
- Controls page for item type colors plus packing setup
- Portrait print calendar that can be saved as a PDF, including a status legend with brief Chinese explanations for each status icon

## Data and Persistence

- Trips, itinerary items, planning todos, packing items, bag setup, category setup, color settings, and cost settings are stored locally in browser `localStorage`
- JSON export/import preserves itinerary data, planning todo structure, packing data, item type colors, and cost settings

## Notes

- `Reset data` clears itinerary items, planning todos, packing items, bag setup, and trip notes for the current trip while keeping the trip shell in Saved Trips.
- `Delete` removes the trip from Saved Trips entirely.
- The old sidebar planning-todo layout is gone; planning now has its own main view, while the sidebar is used for selected-day context and warnings on calendar/list/day views.
- The Costs page uses the trip's stored display currency and exchange rate instead of live exchange-rate data.
