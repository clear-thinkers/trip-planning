import { getDatePart } from "./format.js";

export function isMultiDayItem(item) {
  const startDate = getDatePart(item.startDateTime);
  const endDate = getDatePart(item.endDateTime);
  return !!(startDate && endDate && endDate > startDate);
}

// Pure: takes a pre-filtered items array and a week's ISO date strings (Sun–Sat).
// Returns [{ item, colStart, colEnd, isContinuation, isExtending }] for the span layer.
// colStart/colEnd are 1-indexed grid column values (colEnd is exclusive, so max is 8).
export function computeSpanBarsForWeek(items, weekDates) {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  return items
    .filter((item) => {
      if (!isMultiDayItem(item)) return false;
      const startDate = getDatePart(item.startDateTime);
      const endDate = getDatePart(item.endDateTime);
      return startDate <= weekEnd && endDate >= weekStart;
    })
    .sort((a, b) => {
      const aStart = getDatePart(a.startDateTime) || "";
      const bStart = getDatePart(b.startDateTime) || "";
      return aStart.localeCompare(bStart) || (a.title || "").localeCompare(b.title || "");
    })
    .map((item) => {
      const startDate = getDatePart(item.startDateTime);
      const endDate = getDatePart(item.endDateTime);
      const isContinuation = startDate < weekStart;
      const isExtending = endDate > weekEnd;
      const colStart = isContinuation ? 1 : weekDates.indexOf(startDate) + 1;
      const colEnd = isExtending ? 8 : weekDates.indexOf(endDate) + 2;
      return { item, colStart, colEnd, isContinuation, isExtending };
    });
}
