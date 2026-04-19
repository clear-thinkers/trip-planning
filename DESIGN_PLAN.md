# Trip Planning App Design Plan

## 1. Product Goal

Build a simple personal trip planning app that collects all travel-related plans in one place:

- Flights
- Hotels and lodging
- Activities and tickets
- Family visits
- Meals and gatherings
- Transit, errands, buffers, and reminders

The app should support both macro review and micro adjustment:

- Macro: see the whole trip across days, cities, and major commitments.
- Micro: zoom into one day and inspect the order, timing, location, notes, and gaps between activities.

This first phase is design-only. No implementation code is included here.

## 2. Core User Experience

The app should open directly into useful planning context, not a marketing-style landing page.
For the first version, the app starts at Saved Trips, then opens each trip into Calendar View because pre-trip planning is the priority.

Primary screens:

1. Saved Trips
   - Lists all locally saved trips.
   - Allows creating, opening, resetting, and deleting trips.
   - Helps support planning for multiple separate trips.

2. Calendar View
   - Default screen after opening a trip.
   - Shows the trip across days and weeks.
   - Helps answer: "What is happening when, where are the gaps, and what needs adjusting before the trip?"

3. Trip Overview
   - Shows the whole trip date range.
   - Helps answer: "Where am I each day, what are the anchors, and are there conflicts?"

4. List View
   - Chronological itinerary grouped by date.
   - Good for reviewing all reservations, confirmations, addresses, and notes.

5. Day Detail View
   - Focuses on one selected day.
   - Shows all activities in order, including travel time, gaps, and conflicts.
   - Supports lightweight edits and reordering.

6. Item Detail Panel
   - Opens from any activity, flight, hotel, or meal.
   - Contains confirmation numbers, addresses, links, attachments, notes, people, and cost.

## 3. Key Interaction Model

The app should make zooming natural:

- Trip level: timeline of all days.
- Week level: compact calendar with each day summarized.
- Day level: agenda with exact timing and notes.
- Item level: details, metadata, links, and attachments.

Suggested flow:

1. User chooses a saved trip or creates a new trip.
2. User opens a trip into Calendar View.
3. User adds fixed anchors first: flights, lodging, major events.
4. User adds flexible items: meals, sightseeing, visits, errands.
5. User reviews conflicts, gaps, and overly busy days in calendar or day view.
6. User tweaks dates, times, order, notes, or status before the trip.
7. User switches to list view when they want a practical itinerary-style review.

## 4. MVP Scope

The first usable version should focus on manual planning with structured data.

Included:

- Create one or more trips.
- Saved trips page for multi-trip planning.
- Reset or delete individual trips.
- Add, edit, delete itinerary items.
- Item types:
  - Flight
  - Hotel
  - Activity
  - Family Visit
  - Meal
  - Transit
  - Reminder
  - Custom
- Calendar view by day/week.
- List view grouped by date.
- Day detail view.
- Item detail panel.
- Basic conflict detection for overlapping timed items.
- Search/filter by type, city, person, status, or tag.
- Local persistence.

Not included in MVP:

- Automatic email parsing.
- Live flight status.
- Hotel booking sync.
- Multi-user collaboration.
- Mobile native app.
- Complex route optimization.
- Full expense splitting.

These can be added later after the core planning loop feels good.

## 5. Information Architecture

### Trip

A trip is the top-level container.

Fields:

- id
- title
- startDate
- endDate
- homeTimezone
- destinationTimezones
- defaultCurrency
- notes
- createdAt
- updatedAt

### Itinerary Item

Every flight, hotel stay, meal, activity, visit, or reminder is represented as an itinerary item.

Fields:

- id
- tripId
- type
- title
- startDateTime
- endDateTime
- startTbd
- endTbd
- startTimeTbd
- endTimeTbd
- allDay
- startTimezone
- endTimezone
- locationId
- city
- status
- priority
- notes
- links
- attachments
- confirmationCode
- cost
- currency: USD or RMB
- peopleIds
- tags
- source
- createdAt
- updatedAt

Timezone choices are intentionally limited for the first version:

- US EST
- US CDT
- 北京时间

Start and end date/time fields should each store an explicit timezone choice, defaulting to 北京时间.
Timezone dropdowns should use the full labels above; itinerary cards should use compact labels: ET, CT, and 北京.
Users can mark either start or end date/time as fully TBD, or mark only the time as TBD while keeping the date.
Those records should surface planning warnings.

Currency choices are intentionally limited for the first version:

- USD
- RMB

Each itinerary item can store an optional cost and a required currency value, defaulting to USD.

Recommended item statuses:

- Idea
- Planned
- Booked
- Confirmed
- Done
- Skipped

Status icon design:

- Place a small status icon in the top-right corner of every itinerary card.
- Keep the text status label available in detail views and for screen readers; the icon is a quick visual cue, not the only status signal.
- Use a 20px square touch/click target with a 16px icon inside.
- Use the same icon set across the app, preferably a line icon set such as Lucide.
- Use distinct status colors so cards can be scanned quickly: gray for Idea, blue for Planned, amber for Booked, green for Confirmed/Done, and muted gray for Skipped.
- Give each icon a lightly tinted background and border, not just a colored stroke, so the state remains visible on dense calendar cards.

Status icon mapping:

| Status | Icon | Color role | Meaning |
| --- | --- | --- | --- |
| Idea | `lightbulb` | Gray | Possible plan, not committed yet. |
| Planned | `calendar-days` | Blue | Placed on the itinerary but not booked. |
| Booked | `ticket-check` | Amber | Reservation or ticket exists. |
| Confirmed | `shield-check` | Green | Details are verified and ready. |
| Done | `circle-check` | Green | Completed during the trip. |
| Skipped | `circle-slash` | Muted gray | Intentionally not happening. |

Recommended priorities:

- Must Do
- Should Do
- Nice To Have

### Location

Fields:

- id
- name
- address
- city
- country
- latitude
- longitude
- notes

### Person

Fields:

- id
- name
- relationship
- contact
- notes

### Attachment

Fields:

- id
- itemId
- filename
- fileType
- storagePath
- notes

Attachments can eventually hold screenshots, PDFs, booking confirmations, tickets, menus, or maps.

## 6. Item Types

### Flight

Additional fields:

- airline
- departureCity
- arrivalCity
- terminal
- gate
- seat
- bookingReference
- checkedBagInfo

Display behavior:

- Use departure and arrival times.
- Show departing city, arrival city, airline, and confirmation prominently.
- Do not use the generic location field for flights.
- Warn if flight overlaps with another hard commitment.

### Hotel

Additional fields:

- hotelName
- checkInDateTime
- checkOutDateTime
- reservationName
- confirmationCode
- roomType

Display behavior:

- Show as a multi-day lodging block.
- Show check-in and check-out events in day view.

### Activity

Additional fields:

- bookingWindow
- ticketRequired
- reservationRequired
- indoorOutdoor
- weatherSensitive

### Family Visit

Additional fields:

- hostPersonId
- guestPeopleIds
- occasion
- giftReminder

### Meal

Additional fields:

- restaurantName
- reservationTime
- reservationName
- partySize
- cuisine
- dietaryNotes

### Transit

Additional fields:

- mode
- provider
- pickupLocation
- dropoffLocation
- bookingReference

## 7. View Design

### Visual Design Direction

Preference:

- Minimalist.
- Clean, sleek, and intuitive.
- Calm enough for planning, but not visually flat.
- Use one consistent color palette across the app.

Chosen palette:

- Background: #F7F8FA
- Surface: #FFFFFF
- Primary text: #1F2933
- Secondary text: #6B7280
- Border: #D7DEE8
- Primary action: #2F6F73
- Primary action hover: #285F63
- Accent: #D9A441
- Warning: #B45309
- Error: #B42318
- Success: #2E7D5B

Usage rules:

- Use white surfaces on a soft gray background.
- Use teal-green for primary actions and active states.
- Use muted gold only for small accents, highlights, and important planning markers.
- Use warning, error, and success colors only for status or validation.
- Avoid introducing additional decorative colors unless a new semantic state truly needs one.
- Keep spacing generous and controls obvious.
- Prefer direct labels and simple interactions over dense menus.

### Trip Overview

Purpose:

- Give a high-level sense of the whole trip.
- Identify the main city, lodging, and anchor events for each day.

Layout:

- Header: trip title, date range, timezone, quick add button.
- Horizontal or vertical day strip.
- Each day shows:
  - Date
  - City or primary location
  - Lodging
  - Top 2-4 major items
  - Conflict or warning badges

Useful interactions:

- Click a day to open day detail.
- Drag a flexible activity to another day.
- Filter by item type.

### Calendar View

Purpose:

- Review timing and density.
- Spot overlaps and awkward gaps.
- Share a printable/PDF calendar summary with others.

Modes:

- Week calendar
- Day calendar

Rules:

- Timed items appear in time slots.
- All-day or multi-day items appear at the top.
- Flights and lodging use distinct visual treatment.
- Overlaps show clear warnings.
- A Print calendar action should open the browser print dialog for the Calendar view.
- The print layout should use portrait orientation and fit the calendar dates onto one page.
- The print layout should hide editing controls, filters, alerts, side panels, and dense item metadata, leaving a clean calendar with trip title and date range.
- Users can save the print output as a PDF for sharing.

### List View

Purpose:

- Practical itinerary review before and during the trip.

Layout:

- Group by date.
- Within each date, sort by start time.
- Untimed items appear in a separate "Flexible" area for that day.

Each row should show:

- Time or all-day label
- Type
- Title
- Location
- Status icon in the card's top-right corner
- Key confirmation info when relevant

Status icon behavior:

- The icon should remain visually stable as status changes and should not shift the card layout.
- Hover or focus can reveal the full status label in a tooltip.
- Clicking the icon may open an inline status picker once inline editing exists.
- Cards can still show a status badge elsewhere when extra clarity is useful, but the top-right icon is the primary compact status cue.

Time display rules:

- Use compact 12-hour time on itinerary cards and rows.
- Drop `:00` for exact hours, such as `7pm`.
- Keep minutes for non-exact hours, such as `10:10am`.
- Use compact timezone labels on cards: ET, CT, and 北京.
- Hide timezone labels when every displayed item on the same day uses the same timezone.

### Day Detail View

Purpose:

- Micro review and fine-tuning.

Sections:

- Day header with date, city, weather placeholder, and notes.
- Timeline of timed items.
- Flexible items not yet scheduled.
- Gaps between items.
- Warnings for conflicts, tight transitions, missing addresses, or unconfirmed bookings.

Useful interactions:

- Reorder flexible items.
- Adjust start and end times.
- Mark an item as confirmed, done, skipped, or still an idea.
- Add a buffer block.
- Open item detail panel.

### Item Detail Panel

Purpose:

- Keep each booking or plan self-contained.

Fields shown:

- Title
- Type
- Time/date
- Location
- People
- Status
- Confirmation code
- Cost
- Notes
- Links
- Attachments
- Tags

## 8. Planning Intelligence

Keep the first version simple, but design data so smarter features can be added.

MVP checks:

- Overlapping timed items.
- Missing end time for important item types.
- Missing location for booked activity, meal, hotel, or visit.
- Start or end date/time marked TBD, including time-only TBD.
- Hotel gap: no lodging for a night inside trip date range.
- Tight transition: less than configurable buffer between two items.

Later checks:

- Travel time between locations.
- Flight delay awareness.
- Weather-sensitive activity warnings.
- Restaurant hours.
- Visa/passport/document reminders.

## 9. Editing Model

The app should feel lightweight, not like filling tax forms.

Recommended editing patterns:

- Quick add: title, type, date, optional time.
- Detail edit: all metadata.
- Inline status change from list/day view.
- Drag to reorder flexible items.
- Drag or resize calendar items when implementation supports it.

Soft validation:

- Warnings should not block saving.
- User can keep incomplete ideas in the plan.
- Missing data should be visible but not annoying.

## 10. Data Storage Recommendation

For a self-use web app, start local-first.

Recommended first storage:

- Browser local database, such as IndexedDB.
- Export/import as JSON.

Future storage options:

- SQLite if building a desktop app.
- Supabase or similar if sync across devices becomes important.
- Google Calendar export if calendar interoperability matters.

Important design principle:

- Keep the core itinerary data provider-agnostic, so future sync/import features do not reshape the whole app.

## 11. Suggested Tech Direction

Because this workspace is currently empty, the implementation stack is still open, but the first version should be a web app.

Recommended web app stack:

- React or Next.js for UI.
- TypeScript for data safety.
- IndexedDB for local persistence.
- A calendar component only if it cleanly supports custom item rendering and drag behavior.

Alternative simple stack:

- Static React/Vite app.
- Local JSON import/export.
- Easier to deploy privately and keep lightweight.

Avoid in the first version:

- Backend accounts.
- Heavy authentication.
- Complex calendar sync.
- Full booking import pipelines.

## 12. Proposed App Structure

When implementation starts, a clean module structure could be:

```text
src/
  app/
    trips/
      TripWorkspace.tsx
      TripOverview.tsx
      CalendarView.tsx
      ListView.tsx
      DayDetailView.tsx
      ItemDetailPanel.tsx
  lib/
    itinerary/
      types.ts
      dateUtils.ts
      conflictDetection.ts
      validation.ts
      sampleData.ts
    storage/
      tripRepository.ts
  components/
    ui/
```

If using Next.js app router, this can be adapted to the app directory conventions.

## 13. MVP Milestones

### Milestone 1: Static Prototype

- Define data types.
- Create sample trip data.
- Render calendar view first, then trip overview, list view, and day detail with static data.
- No persistence yet.

### Milestone 2: Manual Editing

- Add item form.
- Edit item detail.
- Delete item.
- Change status.
- Switch views while preserving selected trip/day.

### Milestone 3: Local Persistence

- Save trips locally.
- Load existing trips.
- Export/import JSON.

### Milestone 4: Planning Warnings

- Detect overlaps.
- Detect missing lodging nights.
- Detect tight transitions.
- Surface warnings in overview and day detail.

### Milestone 5: Polish for Real Use

- Keyboard-friendly quick add.
- Better mobile layout.
- Print/export itinerary.
- Attachment/link handling.

## 14. Open Questions

Answered decisions:

- Platform: web app.
- Storage: local-only is fine for the first version.
- Default app entry: Saved Trips.
- Default trip workspace screen: Calendar View.
- Language: English is fine; mixed English/Chinese is acceptable where useful.
- Primary use case: pre-trip planning.

Remaining decisions that will shape the first implementation:

1. Do you usually plan solo trips, family trips, or group trips?
2. Do you care about importing from email/calendar later, or is manual entry enough?
3. Do you want map/location support in the MVP, or should that wait?
4. Should cost metadata roll up into budget totals, or stay item-level only?
5. Should PDF sharing expand beyond the calendar into a full itinerary packet?
6. Should calendar editing support drag/drop in MVP, or is click-to-edit enough first?

## 15. Recommended First Decisions

Confirmed first-version decisions:

- Build a browser-based personal web app.
- Use TypeScript.
- Start with local-only storage.
- Start at a Saved Trips page when multiple trips exist.
- Make Calendar View the default screen after opening a trip.
- Support list, calendar, and day detail views from the beginning.
- Prioritize pre-trip planning over in-trip execution.
- Use English UI by default, with mixed English/Chinese labels acceptable if they make personal use easier.
- Keep import/sync/map features out of MVP, but design the data model so they can be added later.
