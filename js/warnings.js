import { state } from "./state.js";
import { compareItems, eachTripDate, itemOccursOnDate } from "./data.js";
import { formatDateShort, getDatePart } from "./format.js";

export function getWarningsForTrip(trip) {
  const previousTrip = state.trip;
  state.trip = trip;
  const warnings = getWarnings();
  state.trip = previousTrip;
  return warnings;
}

export function getWarnings() {
  return [
    ...getTbdDateTimeWarnings(),
    ...getOverlapWarnings(),
    ...getMissingLocationWarnings(),
    ...getTightTransitionWarnings(),
    ...getLodgingWarnings(),
    ...getUnpackedItemWarnings(),
    ...getUnassignedPackItemWarnings(),
  ];
}

export function getTbdDateTimeWarnings() {
  return state.trip.items
    .filter((item) => item.startTbd || item.endTbd || item.startTimeTbd || item.endTimeTbd)
    .map((item) => {
      const missing = [
        item.startTbd ? "start date/time" : "",
        item.startTimeTbd ? "start time" : "",
        item.endTbd ? "end date/time" : "",
        item.endTimeTbd ? "end time" : "",
      ]
        .filter(Boolean)
        .join(" and ");
      return {
        type: "TBD time",
        date: getDatePart(item.startDateTime || item.endDateTime),
        itemIds: [item.id],
        message: `${item.title} has ${missing} marked TBD.`,
      };
    });
}

export function getOverlapWarnings() {
  const warnings = [];
  eachTripDate().forEach((date) => {
    const timed = state.trip.items
      .filter((item) => item.type !== "Hotel" && itemOccursOnDate(item, date) && item.startDateTime && item.endDateTime && !item.startTimeTbd && !item.endTimeTbd)
      .sort(compareItems);
    timed.forEach((item, index) => {
      const next = timed[index + 1];
      if (!next) return;
      if (new Date(item.endDateTime) > new Date(next.startDateTime)) {
        warnings.push({
          type: "Overlap",
          date,
          itemIds: [item.id, next.id],
          message: `${item.title} overlaps with ${next.title} on ${formatDateShort(date)}.`,
        });
      }
    });
  });
  return warnings;
}

export function getMissingLocationWarnings() {
  return state.trip.items
    .filter((item) => ["Hotel", "Activity", "Family Visit", "Meal"].includes(item.type) && !item.location)
    .map((item) => ({
      type: "Missing location",
      date: getDatePart(item.startDateTime),
      itemIds: [item.id],
      message: `${item.title} needs a location before the trip.`,
    }));
}

export function getTightTransitionWarnings() {
  const warnings = [];
  eachTripDate().forEach((date) => {
    const timed = state.trip.items
      .filter((item) => item.type !== "Hotel" && itemOccursOnDate(item, date) && item.startDateTime && item.endDateTime && !item.startTimeTbd && !item.endTimeTbd)
      .sort(compareItems);
    timed.forEach((item, index) => {
      const next = timed[index + 1];
      if (!next) return;
      const gapMinutes = (new Date(next.startDateTime) - new Date(item.endDateTime)) / 60000;
      const differentPlace = item.location && next.location && item.location !== next.location;
      if (gapMinutes >= 0 && gapMinutes < 45 && differentPlace) {
        warnings.push({
          type: "Tight transition",
          date,
          itemIds: [item.id, next.id],
          message: `${Math.round(gapMinutes)} minutes between ${item.title} and ${next.title}.`,
        });
      }
    });
  });
  return warnings;
}

export function getLodgingWarnings() {
  return eachTripDate()
    .slice(0, -1)
    .filter((date) => {
      return !state.trip.items.some((item) => {
        if (item.type !== "Hotel") return false;
        const start = getDatePart(item.startDateTime);
        const end = getDatePart(item.endDateTime);
        return start && end && date >= start && date < end;
      });
    })
    .map((date) => ({
      type: "Lodging gap",
      date,
      message: `No hotel or lodging block covers the night of ${formatDateShort(date)}.`,
    }));
}

export function getUnpackedItemWarnings() {
  const packItems = (state.trip.packItems || []).filter((item) => item.status !== "Packed");
  if (!packItems.length) return [];
  const now = new Date();
  const tripStart = new Date(`${state.trip.startDate}T00:00:00`);
  const daysUntilStart = Math.ceil((tripStart - now) / 86400000);
  if (daysUntilStart < 0 || daysUntilStart > 3) return [];
  return [
    {
      type: "Unpacked items",
      date: state.trip.startDate,
      message: `${packItems.length} packing items are not yet packed.`,
    },
  ];
}

export function getUnassignedPackItemWarnings() {
  const bags = state.trip.bags || [];
  if (!bags.length) return [];
  const unassignedItems = (state.trip.packItems || []).filter((item) => !item.bagId);
  if (!unassignedItems.length) return [];
  return [
    {
      type: "Unassigned items",
      date: state.trip.startDate,
      message: `${unassignedItems.length} items have not been assigned to a bag.`,
    },
  ];
}
