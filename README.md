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
- Add, edit, and delete itinerary items
- Copy an existing activity to another date
- Item types for flights, hotels, activities, family visits, meals, transit, reminders, and custom plans
- Flight items track departing city, arrival city, airline, and confirmation instead of location
- Filters by type, status, and search
- Fixed timezone choices: US EST, US CDT, and Beijing
- Per-item start and end date-time timezones, defaulting to Beijing
- Start/end date-time can be fully TBD, or only the time can be TBD while keeping the date
- Warnings for records with TBD date/time or time-only TBD
- Planning warnings for overlaps, missing locations, tight transitions, and lodging gaps
- JSON export and import

## Notes

- `Reset data` clears itinerary items for that trip while keeping the trip in your saved trips list.
- `Delete` removes the trip from the saved trips list.
