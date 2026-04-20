# Trip Planner

A local-first personal trip planning web app.

## Run

Open `index.html` in a browser.

No install step is required. Trip data is saved in browser `localStorage`.

## What Works

- Saved trips page for planning multiple trips
- Create, open, reset, and delete trips
- Calendar-first trip workspace
- List view grouped by date
- Day detail review
- Controls view for trip-specific item type colors
- Add, edit, and delete itinerary items
- Copy an existing activity to another date
- Item types for flights, hotels, activities, family visits, meals, transit, rest, reminders, and custom plans
- Flight items track departing city, arrival city, airline, and confirmation instead of location
- Multi-select filters by type and status, plus search
- Per-trip color controls for every item type, with color picker or direct hex input such as `#FD151B`
- Fixed timezone choices: US EST, US CDT, and 北京时间
- Per-item start and end date-time timezones, defaulting to 北京时间
- Compact itinerary times, with timezone labels hidden when every item on the same day uses the same timezone
- Status icons on itinerary cards for quick Idea, Planned, Booked, Confirmed, Done, and Skipped scanning
- Cost metadata with USD or RMB currency per itinerary item
- Portrait, one-page print calendar that can be saved as a PDF from the browser print dialog
- Start/end date-time can be fully TBD, or only the time can be TBD while keeping the date
- Warnings for records with TBD date/time or time-only TBD
- Planning warnings for overlaps, missing locations, tight transitions, and lodging gaps
- JSON export and import

## Notes

- `Reset data` clears itinerary items for that trip while keeping the trip in your saved trips list.
- `Delete` removes the trip from the saved trips list.
- Use the `Controls` tab inside a trip to customize calendar/list/day stripe colors for each item type. Colors can be picked visually or entered as hex codes.
