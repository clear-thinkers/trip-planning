# Trip Planning App Design

This document is the current design record for the local-first trip planner implemented in `index.html`, `styles.css`, `app.js`, and the modular files under `js/`.

## 1. Product Goal

Build a personal planning app that keeps the full pre-trip workflow in one place:

- itinerary items across days and cities
- prep work tracked as planning todos
- packing work tracked separately from itinerary scheduling
- warnings that surface planning risks without blocking progress
- cost tracking across travel plans, planning tasks, and packing purchases

The app should support both overview and cleanup:

- Overview: review trip shape across calendar weeks, cost summaries, and packing progress.
- Cleanup: inspect one day, one todo, one bag, or one item without losing context.

## 2. Current App Architecture

The app now runs as a browser ES module app served from `http://localhost`. It is also a Progressive Web App and can be installed on iOS via "Add to Home Screen" when served over HTTPS. Cloud sharing and collaboration are backed by an AWS serverless stack.

Current file roles:

- `app.js`: top-level render loop, screen coordination, cloud sync lifecycle, and service worker registration
- `js/init.js`: element caching, select population, event binding
- `js/state.js`: normalization, defaults, sample data, persistence
- `js/render-views.js`: trips, itinerary views, planning todos, costs, controls, printing, import/export, cloud share panel
- `js/share.js`: cloud save/load via API, URL construction, debounced auto-save, `hasPendingSave` guard
- `js/cloud-sync.js`: 30-second poll loop for cloud trips, visibility-aware pause/resume, manual sync trigger, "last synced" display
- `js/api.js`: thin wrapper around `signedFetch` for `POST /trips`, `GET /trips/{id}`, `PUT /trips/{id}`, `PATCH /trips/{id}/permission`
- `js/aws-auth.js`: AWS Cognito unauthenticated identity init, SigV4 request signing via AWS SDK v2
- `js/aws-config.js`: `API_BASE_URL`, `IDENTITY_POOL_ID`, `AWS_REGION` constants; `AWS_CONFIGURED` flag
- `js/render-packing.js`: packing list, bag planner, packing dialogs, packing controls
- `js/data.js`: derived trip data, filters, costs, packing progress; exports `getSingleDayItemsForDate` and `getMultiDaySpansForWeek` as stateful wrappers over `calendar-layout.js`
- `js/calendar-layout.js`: pure helpers `isMultiDayItem` and `computeSpanBarsForWeek` — no DOM or state dependencies, importable in Node.js for unit testing
- `js/warnings.js`: trip and packing warning generation
- `js/format.js`: formatting, ids, date helpers, escaping
- `js/constants.js`: item types, statuses, currencies, timezones, default packing categories
- `js/render-shared.js`: shared UI fragments such as status icons and item styling
- `sw.js`: service worker — pre-caches all local assets at install time, serves the app offline via cache-first strategy, notifies open windows when a new version activates
- `manifest.json`: PWA manifest — display name, standalone display mode, theme color, and icons for home screen installation
- `offline.html`: fallback page served when a fetch fails and the resource is not in cache
- `brand.svg`: local brand image used in the app header (replaces external image dependency)
- `backend/template.yaml`: AWS SAM template — API Gateway (inline OpenAPI with AWS_IAM/SigV4 auth), Lambda functions, DynamoDB table, Cognito Identity Pool, IAM roles and resource-based Lambda permissions
- `backend/functions/post-trip/index.js`: creates a trip in DynamoDB; sets `ownerId` from Cognito identity
- `backend/functions/get-trip/index.js`: fetches a trip; enforces `private` permission check against caller identity
- `backend/functions/put-trip/index.js`: full trip replace; requires owner or `editor` permission
- `backend/functions/patch-permission/index.js`: updates `permission` field; owner-only

The design goal of the reorg is to keep each major workflow editable without returning to a single giant file.

## 3. Workspace Model

The app opens to Saved Trips and then into a trip workspace.

The current workspace includes:

1. Saved Trips
   - Create, open, reset, delete, export, and import trips.
   - Supports multiple trips in local storage.

2. Calendar View
   - Default view after opening a trip.
   - Shows itinerary items across calendar weeks.
   - Multi-day items (endDate > startDate) render as horizontal span bars that cross column boundaries; single-day items remain as per-cell pills.
   - Span bars that cross a week boundary wrap into continuation segments in the next week row, marked with a ◄ arrow.
   - Supports drag-and-drop to move an item's start date; duration is preserved on drop.

3. List View
   - Chronological itinerary grouped by date.

4. Day Detail View
   - Focuses on one selected day and its warnings.

5. Planning Todos View
   - Dedicated trip-wide checklist workspace.
   - Includes a due-date calendar plus the editable checklist itself.

6. Packing View
   - Dedicated packing workspace.
   - Includes a packing list mode and a bag planner mode.

7. Costs View
   - Aggregates travel, planning, and packing costs.

8. Controls View
   - Contains item color controls plus packing setup controls.

9. Right Sidebar
   - Shown only on Calendar, List, and Day Detail views.
   - Contains Selected Day plus the warnings panel.

## 4. Core User Experience

The intended flow is:

1. Create or open a saved trip.
2. Land in Calendar View.
3. Add fixed anchors first: flights, lodging, major visits, appointments, reservations.
4. Add flexible itinerary items: meals, activities, transit, rest, reminders, lessons.
5. Use Planning Todos for prep work with due dates, nested steps, and optional costs.
6. Use Packing to build item lists, categorize gear, and assign things to bags.
7. Review warnings and cost totals as the plan becomes more concrete.
8. Use Controls to tune item colors and packing structure.
9. Print the calendar as a PDF when a paper-like overview is useful.

The design intent stays practical: quick entry, low ceremony, warnings that guide rather than block, and clear separation between itinerary planning, prep tasks, and packing.

## 5. Current Feature Scope

Implemented:

- multi-trip local planning
- modular ES module app structure
- add, edit, copy, and delete itinerary items
- calendar, list, day, planning, packing, costs, and controls views
- contextual filters that change by active view
- trip-wide planning checklist with nested subtodos, due dates, and inline editing
- dedicated packing planner with categories, bags, and bag assignment
- warnings panel plus selected-day context
- cost tracking for itinerary items, todos, subtodos, and packing items
- calendar drag-and-drop for itinerary date changes (works for both single-day pills and multi-day span bars; duration preserved on move)
- drag-to-reorder for todos, subtodos, bags, categories, and sub-categories where relevant
- multi-day calendar span bars that cross column and week-row boundaries, with continuation and extending visual indicators
- JSON export/import
- Cloud sharing — trip saved to AWS DynamoDB; share link uses `#trip=<uuid>` hash; recipients open the link and the trip is fetched from the API automatically
- Permission control — owner sets `private`, `read_only`, or `editor` access from the share panel; optimistic UI with revert on failure
- Cloud auto-save — debounced 1.5-second save to cloud after every edit, for owners and editors
- Cloud polling — active trips with a `cloudId` poll `GET /trips/{id}` every 30 seconds; pauses when tab is hidden, resumes on focus; manual refresh button in topbar; "Last synced X seconds ago" in share panel
- Read-only banner — shown to non-owner visitors on `read_only` trips
- Cognito unauthenticated identity — each browser gets a stable anonymous identity used for ownership and SigV4 signing
- file-storage recovery helper for old `file:///` usage
- print-friendly calendar output with status legend
- typed confirmations for destructive actions
- PWA with offline support and iOS "Add to Home Screen" installation

Explicitly not in scope right now:

- live booking sync
- email parsing
- mobile native packaging
- live exchange-rate lookup
- automatic reminders/calendar integrations

## 6. Information Architecture

### Trip

A trip is the top-level container.

Fields:

- `id`
- `title`
- `startDate`
- `endDate`
- `homeTimezone`
- `notes`
- `people`
- `itemTypeColors`
- `costSettings`
- `items`
- `todos`
- `packCategories`
- `packItems`
- `bags`

`itemTypeColors` stores per-trip item stripe colors.

`costSettings` currently stores:

- `displayCurrency`
- `usdToRmbRate`

### Itinerary Item

Each calendar/list/day card is an itinerary item.

Core fields:

- `id`
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
- `departureCity`
- `arrivalCity`
- `airline`
- `city`
- `location`
- `status`
- `priority`
- `notes`
- `links`
- `attachments`
- `confirmationCode`
- `cost`
- `currency`
- `people`
- `tags`
- `source`
- `createdAt`
- `updatedAt`

Supported itinerary statuses:

- `Idea`
- `Planned`
- `Booked`
- `Confirmed`
- `Done`
- `Skipped`

### Todo

Planning todos are stored at the trip level.

Fields:

- `id`
- `text`
- `done`
- `order`
- `dueDate`
- `cost`
- `currency`
- `subtodos`
- `createdAt`
- `updatedAt`

### Subtodo

Nested subtodos use the same main task model in smaller form.

Fields:

- `id`
- `text`
- `done`
- `order`
- `dueDate`
- `cost`
- `currency`
- `createdAt`
- `updatedAt`

Behavior rules:

- parent todos can expand/collapse
- parent and child rows can both be dragged to reorder
- text, cost, currency, and due date are edited inline
- a parent todo can only be completed when all subtodos are done

### Packing Item

Packing items are separate from itinerary items.

Fields:

- `id`
- `title`
- `categoryId`
- `subCategoryId`
- `status`
- `quantity`
- `tags`
- `bagId`
- `cost`
- `currency`
- `notes`
- `order`
- `createdAt`
- `updatedAt`

Supported packing statuses:

- `Idea`
- `Purchased`
- `Packed`

### Packing Category

Packing categories are a two-level tree used by the packing list.

Fields:

- `id`
- `label`
- `icon`
- `order`
- `subcategories`

Each sub-category includes:

- `id`
- `label`
- `order`

### Bag

Bags support assignment and overview in the bag planner.

Fields:

- `id`
- `label`
- `size`
- `weightLimit`
- `color`
- `order`

## 7. View Design

### Visual Direction

The app aims for:

- calm, information-dense planning surfaces
- straightforward controls over hidden gestures
- semantic color coding for scanning
- clear separation between itinerary, prep tasks, and packing logistics

The palette still centers on white surfaces, soft gray structure, teal primary actions, and semantic accent colors.

### Calendar View

Purpose:

- Review the trip across dates.
- Spot density, missing anchors, and conflicts quickly.

Current behavior:

- calendar is structured as per-week containers, each with an optional span layer (for multi-day items) above a day layer (for single-day pills)
- multi-day items (endDate > startDate) render as span bars using CSS `grid-column` to cross day-column boundaries; they are removed from the per-cell pill stacks
- continuation segments (◄ prefix, flat left edge) appear in subsequent week rows when a span crosses a week boundary; extending segments (flat right edge) appear when a span exits the right edge of a week row
- single-day items continue to render as per-cell pills, capped at 4 per day with a "+N more" indicator
- drag-and-drop works for both pills and span bars; dropping onto any day cell moves the item's start date while preserving duration
- uses trip-specific item type colors
- supports print-to-PDF output; span bars render in compact form in print layout
- printed calendar includes a status legend with Chinese descriptions for each status icon
- print layout is optimized for elderly readability: large fonts (1.02rem+ for event titles, 0.92rem+ for secondary text, 1.16rem for date numbers), auto-height week rows that shrink to content (no fixed row height), all items per day shown without truncation, no content clipping

### List View

Purpose:

- Review the trip as a practical itinerary.

Current behavior:

- groups items by date
- uses the same item-type color coding as Calendar and Day Detail
- includes a separate TBD / unscheduled section

### Day Detail View

Purpose:

- Inspect one day closely.

Current behavior:

- shows day-specific items in order
- surfaces day warnings inline
- works with the Selected Day sidebar context

### Selected Day Sidebar

Purpose:

- Keep the currently selected day visible while navigating itinerary views.

Current behavior:

- shown on Calendar, List, and Day Detail views only
- shows selected date and primary city
- shows item count and day-specific warning count
- lists that day's itinerary cards
- offers quick actions to add to the day or jump to Day Detail

### Warnings Panel

Purpose:

- Keep planning issues visible without dominating the main workspace.

Current behavior:

- lives in the sidebar below Selected Day
- collapsed by default
- shows total warning count
- expands to reveal full warning list

### Planning Todos View

Purpose:

- Track trip prep work that is not scheduled as itinerary.

Current behavior:

- due-date calendar above the checklist
- on mobile the due-date calendar section is collapsible (starts expanded, tap the header to collapse)
- add parent todos with optional cost and due date
- add nested subtodos
- drag-to-reorder parent and child items
- inline editing for text, cost, currency, and due date
- filters for open/done state and due-date bucket

### Packing View

Purpose:

- Separate what needs to be packed from what needs to be scheduled.

Current behavior:

- two subviews: Packing list and Bag planner
- packing list groups items by category and sub-category
- quick-add within categories plus full packing item dialog
- status cycling between idea, purchased, and packed
- optional quantity, tags, bag assignment, notes, and cost
- bag planner supports drag-and-drop bag assignment
- bag columns show progress and total tracked bag cost

### Costs View

Purpose:

- Roll up planning-related spending in one place.

Current behavior:

- summary cards for total tracked, travel plans, planning todos, and packing items
- detailed breakdown sections for all three cost sources
- display currency selector
- editable USD/RMB exchange rate
- normalized totals and row display in the selected currency

### Controls View

Purpose:

- Let users tune the planning system without editing data structures manually.

Current behavior:

- item type color controls with color picker and hex input
- reset per type or reset all
- people list management: add and remove named people used when tagging itinerary items
- bag controls for label, size, weight limit, and color
- editable packing category and sub-category tree

## 8. Filters and Search

Current filter behavior is view-specific:

- itinerary views use multi-select Type and Status filters plus Search
- planning view reuses those controls as Todo status and Due date filters
- packing view reuses them as Packing status and Tags filters
- costs view reuses them as Price rule, Currency, Amount, and Search controls

This keeps one shared filter area while adapting it to the current task.

## 9. Planning Intelligence

Current warnings include:

- overlapping timed itinerary items
- missing locations for relevant itinerary types
- tight transitions between timed items in different places
- lodging gaps
- fully TBD or time-only TBD date/time fields
- unpacked packing items within three days of trip start
- packing items not assigned to a bag when bags exist

Warnings are meant to guide planning, not block saving.

## 10. Editing Model

Current editing principles:

- allow incomplete ideas to exist
- keep warnings non-blocking
- use inline editing where it reduces friction
- reserve dialogs for objects with many fields
- keep drag-and-drop limited to interactions that feel obvious

Examples already implemented:

- modal editing for itinerary items and packing items
- inline editing for todos and subtodos
- drag-and-drop itinerary date changes
- drag-and-drop todo and subtodo ordering
- drag-and-drop bag assignment in the packing planner

## 11. Data Storage

The app is local-first with optional cloud sync.

Local storage model:

- browser `localStorage` — primary store for all trips and settings
- JSON export/import for backup and transfer
- `recover-file-storage.html` for migrating old `file:///` local storage into the served app

Cloud storage model (AWS):

- **DynamoDB** table `trip-planner-trips` — stores trips as `{ id, data, ownerId, permission, createdAt, updatedAt }`; `data` is the full trip JSON
- **API Gateway** (SigV4/AWS_IAM auth) exposes four endpoints: `POST /trips`, `GET /trips/{id}`, `PUT /trips/{id}`, `PATCH /trips/{id}/permission`
- **Cognito Identity Pool** (unauthenticated) issues stable anonymous identities; the Cognito identity ID is used as `ownerId` and for permission enforcement
- **Lambda** functions (Node.js 20.x) — one per endpoint; resource-based permissions (no IAM credentials injection)
- **Share URL** format: `#trip=<uuid>` — the UUID is the DynamoDB item key; opening the link fetches the trip from the API

Cloud sync behavior:

- `saveToCloud` (via `scheduleCloudSave`) debounces writes 1.5 s after each edit; only fires for owners and editors
- `cloud-sync.js` polls `GET /trips/{id}` every 30 s; merges server data if `result.updatedAt` is newer than the last known server timestamp; skips the merge cycle if a local auto-save is pending
- Polling pauses when the tab is hidden and resumes (with an immediate fetch) when visibility returns

Export/import preserves:

- itinerary items
- planning todo hierarchy
- planning todo ordering
- packing items
- packing categories
- bags
- item type colors
- cost settings

## 12. Safety and Destructive Actions

To reduce accidental data loss:

- `Reset data` requires typing `RESET`
- `Delete` trip requires typing `DELETE`
- deleting bags or packing categories warns before items are left unassigned or moved to General

These confirmations are intentionally stronger than a simple click-through warning.

## 13. Tech Direction

The frontend stays intentionally lightweight:

- static HTML and CSS
- browser-native modules instead of a framework build step
- rendering organized by workflow rather than by framework convention
- service worker for offline-first caching and iOS home screen installation (PWA)

The backend uses AWS SAM (Serverless Application Model):

- **API Gateway** — inline OpenAPI `DefinitionBody` with `x-amazon-apigateway-authtype: awsSigv4`; no integration credentials field so invocation relies entirely on resource-based Lambda permissions
- **Lambda** — Node.js 20.x; one function per route; `DynamoDBCrudPolicy` / `DynamoDBReadPolicy` managed policies
- **DynamoDB** — single-table `trip-planner-trips`, PAY_PER_REQUEST, hash key `id`
- **Cognito Identity Pool** — unauthenticated identities; the `trip-planner-guest-role` IAM role is granted `execute-api:Invoke` via `GuestRoleApiPolicy`
- Deploy: `sam build && sam deploy` from `backend/`

**Auth flow:** the browser calls `AWS.CognitoIdentityCredentials.getPromise()` on startup to obtain temporary SigV4 credentials. Every API call is signed with `AWS.Signers.V4` before fetch. The Cognito identity ID is forwarded by API Gateway in `requestContext.identity.cognitoIdentityId` and used by Lambda for ownership checks.

**Cache busting:** Because the strategy is cache-first, any change to a cached asset (CSS, JS, HTML) will not be visible in the browser until the `CACHE` constant in `sw.js` is bumped to a new version string. The old service worker's activate handler deletes the previous cache. Always bump the cache version alongside any front-end asset change, or the browser will silently serve stale files.

HTTPS is required in production for service workers and the home screen install prompt. The local `http://localhost` dev server bypasses this restriction for development.

## 14. Next Useful Enhancements

Likely future improvements:

- richer budgeting summaries beyond total tracked
- optional export formats for planning and packing lists
- better mobile ergonomics for dense views
- richer itinerary editing beyond moving start date
- smarter packing warnings and bag-weight logic
- optional integrations after the local workflow feels stable
