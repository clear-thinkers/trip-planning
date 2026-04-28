// Unit tests for js/calendar-layout.js pure helper functions.
// Run with: node tests/calendar-layout.test.mjs

import { isMultiDayItem, computeSpanBarsForWeek } from "../js/calendar-layout.js";

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.error(`  ✗ ${description}`);
    failed++;
  }
}

function makeItem(overrides = {}) {
  return {
    id: "test-1",
    title: "Test Item",
    type: "Hotel",
    status: "Booked",
    startDateTime: "2025-05-05T14:00",
    endDateTime: "2025-05-08T11:00",
    startTimeTbd: false,
    endTbd: false,
    allDay: false,
    ...overrides,
  };
}

// Week: Sun May 4 – Sat May 10 2025
const WEEK = ["2025-05-04", "2025-05-05", "2025-05-06", "2025-05-07", "2025-05-08", "2025-05-09", "2025-05-10"];

// ── isMultiDayItem ──────────────────────────────────────────────────────────

console.log("\nisMultiDayItem");

assert(
  "returns true when endDate > startDate",
  isMultiDayItem(makeItem({ startDateTime: "2025-05-05T14:00", endDateTime: "2025-05-08T11:00" })) === true,
);

assert(
  "returns false when endDate === startDate",
  isMultiDayItem(makeItem({ startDateTime: "2025-05-05T08:00", endDateTime: "2025-05-05T23:59" })) === false,
);

assert(
  "returns false when endDateTime is absent",
  isMultiDayItem(makeItem({ startDateTime: "2025-05-05T08:00", endDateTime: "" })) === false,
);

assert(
  "returns false when startDateTime is absent",
  isMultiDayItem(makeItem({ startDateTime: "", endDateTime: "2025-05-08T11:00" })) === false,
);

assert(
  "returns false when both are absent",
  isMultiDayItem(makeItem({ startDateTime: "", endDateTime: "" })) === false,
);

// ── computeSpanBarsForWeek ───────────────────────────────────────────────────

console.log("\ncomputeSpanBarsForWeek");

// Basic: item starts Mon May 5, ends Thu May 8 — fully within the week
{
  const item = makeItem({ startDateTime: "2025-05-05T14:00", endDateTime: "2025-05-08T11:00" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("returns one bar for a fully-within-week item", bars.length === 1);
  assert("colStart = 2 (Monday is index 1, so 1-indexed col 2)", bars[0]?.colStart === 2);
  assert("colEnd = 6 (Thursday index 4, exclusive end = 5, 1-indexed = 5+1=6)", bars[0]?.colEnd === 6);
  assert("isContinuation = false", bars[0]?.isContinuation === false);
  assert("isExtending = false", bars[0]?.isExtending === false);
}

// Item starts before the week (continuation)
{
  const item = makeItem({ startDateTime: "2025-04-30T12:00", endDateTime: "2025-05-06T10:00" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("returns one bar when item started before week", bars.length === 1);
  assert("colStart = 1 for continuation", bars[0]?.colStart === 1);
  assert("colEnd = 4 (Tuesday=index 2, exclusive=3, 1-indexed=4)", bars[0]?.colEnd === 4);
  assert("isContinuation = true", bars[0]?.isContinuation === true);
  assert("isExtending = false", bars[0]?.isExtending === false);
}

// Item ends after the week (extending)
{
  const item = makeItem({ startDateTime: "2025-05-08T12:00", endDateTime: "2025-05-15T10:00" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("returns one bar when item extends past week", bars.length === 1);
  assert("colStart = 5 (Thursday is index 4 in WEEK, so 1-indexed col 5)", bars[0]?.colStart === 5);
  assert("colEnd = 8 for extending", bars[0]?.colEnd === 8);
  assert("isContinuation = false", bars[0]?.isContinuation === false);
  assert("isExtending = true", bars[0]?.isExtending === true);
}

// Item spans entire week (continuation + extending)
{
  const item = makeItem({ startDateTime: "2025-04-28T00:00", endDateTime: "2025-05-14T00:00" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("returns one bar spanning full week", bars.length === 1);
  assert("colStart = 1", bars[0]?.colStart === 1);
  assert("colEnd = 8", bars[0]?.colEnd === 8);
  assert("isContinuation = true", bars[0]?.isContinuation === true);
  assert("isExtending = true", bars[0]?.isExtending === true);
}

// Single-day item — must not appear in span layer
{
  const item = makeItem({ startDateTime: "2025-05-06T09:00", endDateTime: "2025-05-06T18:00" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("single-day item (same start/end date) is excluded", bars.length === 0);
}

// Item with no endDateTime — excluded
{
  const item = makeItem({ startDateTime: "2025-05-06T09:00", endDateTime: "" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("item with no endDateTime is excluded", bars.length === 0);
}

// Item entirely before this week — excluded
{
  const item = makeItem({ startDateTime: "2025-04-20T00:00", endDateTime: "2025-04-30T00:00" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("item ending before week start is excluded", bars.length === 0);
}

// Item entirely after this week — excluded
{
  const item = makeItem({ startDateTime: "2025-05-12T00:00", endDateTime: "2025-05-15T00:00" });
  const bars = computeSpanBarsForWeek([item], WEEK);
  assert("item starting after week end is excluded", bars.length === 0);
}

// Two overlapping multi-day items — both returned
{
  const hotel = makeItem({ id: "h1", title: "Hotel", startDateTime: "2025-05-05T14:00", endDateTime: "2025-05-10T11:00" });
  const tour = makeItem({ id: "t1", title: "City Tour", type: "Activity", startDateTime: "2025-05-06T09:00", endDateTime: "2025-05-08T18:00" });
  const bars = computeSpanBarsForWeek([hotel, tour], WEEK);
  assert("both overlapping items are returned", bars.length === 2);
}

// Sort order: items sorted by start date ascending
{
  const later = makeItem({ id: "l1", title: "Later", startDateTime: "2025-05-08T00:00", endDateTime: "2025-05-10T00:00" });
  const earlier = makeItem({ id: "e1", title: "Earlier", startDateTime: "2025-05-05T00:00", endDateTime: "2025-05-07T00:00" });
  const bars = computeSpanBarsForWeek([later, earlier], WEEK);
  assert("items are sorted by start date ascending", bars[0]?.item.id === "e1" && bars[1]?.item.id === "l1");
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
