// Tests for print-view CSS rules.
// Verifies elderly-friendly font sizes, no overflow clipping on day cells,
// and auto-height week rows.
// Run with: node tests/print-styles.test.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(__dirname, "../styles.css"), "utf8");

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

// Extract the @media print block so we only test print rules.
const printBlockMatch = css.match(/@media print\s*\{([\s\S]*?)^\}/m);
if (!printBlockMatch) {
  console.error("FATAL: could not locate @media print block");
  process.exit(1);
}
const printCss = printBlockMatch[1];

// Helper: extract the value of a property within a rule block for a selector.
// Returns null if not found.
function getPrintProp(selector, property) {
  // Escape special CSS chars for regex matching.
  const selEsc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${selEsc}\\s*\\{([^}]*)\\}`, "g");
  let match;
  while ((match = re.exec(printCss)) !== null) {
    const block = match[1];
    const propRe = new RegExp(`${property}\\s*:\\s*([^;]+);`);
    const propMatch = block.match(propRe);
    if (propMatch) return propMatch[1].trim();
  }
  return null;
}

// Parse rem value as a float (e.g. "0.82rem" → 0.82).
function rem(val) {
  if (!val) return null;
  const m = val.match(/([\d.]+)rem/);
  return m ? parseFloat(m[1]) : null;
}

// ── Structural rules ─────────────────────────────────────────────────────────

console.log("\nStructural rules");

assert(
  ".day-layer uses flex layout so each cell sizes independently",
  getPrintProp(".day-layer", "display") === "flex",
);

assert(
  ".day-layer aligns cells to flex-start so short cells don't stretch",
  getPrintProp(".day-layer", "align-items") === "flex-start",
);

assert(
  ".day-cell does not clip content with overflow: hidden",
  getPrintProp(".day-cell", "overflow") !== "hidden",
);

assert(
  ".calendar-board allows content to overflow (not overflow: hidden)",
  getPrintProp(".calendar-board", "overflow") === "visible",
);

// ── Desktop font sizes ───────────────────────────────────────────────────────

const MIN_SECONDARY = 0.90; // times/cities/labels
const MIN_BODY = 1.00;      // event titles, span titles
const MIN_DATE = 1.10;      // date numbers

console.log("\nDesktop print font sizes");

const itemTitleSize = rem(getPrintProp(".item-title", "font-size"));
assert(
  `.item-title font-size >= ${MIN_BODY}rem (was 0.66rem)`,
  itemTitleSize !== null && itemTitleSize >= MIN_BODY,
);

const itemTimeSize = rem(getPrintProp(".item-time", "font-size"));
assert(
  `.item-time font-size >= ${MIN_SECONDARY}rem (was 0.58rem)`,
  itemTimeSize !== null && itemTimeSize >= MIN_SECONDARY,
);

const spanTitleSize = rem(getPrintProp(".span-title", "font-size"));
assert(
  `.span-title font-size >= ${MIN_BODY}rem (was 0.65rem)`,
  spanTitleSize !== null && spanTitleSize >= MIN_BODY,
);

const spanTimeSize = rem(getPrintProp(".span-time", "font-size"));
assert(
  `.span-time font-size >= ${MIN_SECONDARY}rem (was 0.58rem)`,
  spanTimeSize !== null && spanTimeSize >= MIN_SECONDARY,
);

const dateNumberSize = rem(getPrintProp(".date-number", "font-size"));
assert(
  `.date-number font-size >= ${MIN_DATE}rem (was 0.82rem)`,
  dateNumberSize !== null && dateNumberSize >= MIN_DATE,
);

const dayCitySize = rem(getPrintProp(".day-city", "font-size"));
assert(
  `.day-city font-size >= ${MIN_SECONDARY}rem (was 0.62rem)`,
  dayCitySize !== null && dayCitySize >= MIN_SECONDARY,
);

const weekdaySize = rem(getPrintProp(".weekday", "font-size"));
assert(
  `.weekday font-size >= ${MIN_SECONDARY}rem (was 0.68rem)`,
  weekdaySize !== null && weekdaySize >= MIN_SECONDARY,
);

const moreCountSize = rem(getPrintProp(".more-count", "font-size"));
assert(
  `.more-count font-size >= ${MIN_SECONDARY}rem (was 0.58rem)`,
  moreCountSize !== null && moreCountSize >= MIN_SECONDARY,
);

// ── Legend font sizes ────────────────────────────────────────────────────────

console.log("\nLegend font sizes");

// The desktop legend rules (not inside mobile block) — use narrow selector
const legendCopyStrongSize = rem(getPrintProp(".calendar-status-legend-copy strong", "font-size"));
assert(
  `.calendar-status-legend-copy strong >= ${MIN_SECONDARY}rem (was 0.68rem)`,
  legendCopyStrongSize !== null && legendCopyStrongSize >= MIN_SECONDARY,
);

const legendCopySpanSize = rem(getPrintProp(".calendar-status-legend-copy span", "font-size"));
assert(
  `.calendar-status-legend-copy span >= ${MIN_SECONDARY}rem (was 0.62rem)`,
  legendCopySpanSize !== null && legendCopySpanSize >= MIN_SECONDARY,
);

// ── Mobile print font sizes ──────────────────────────────────────────────────

const MIN_MOBILE_BODY = 1.15;
const MIN_MOBILE_SECONDARY = 1.00;

console.log("\nMobile print font sizes");

const mobileDayLabelSize = rem(getPrintProp(".mobile-day-label", "font-size"));
assert(
  `.mobile-day-label font-size >= ${MIN_MOBILE_BODY}rem`,
  mobileDayLabelSize !== null && mobileDayLabelSize >= MIN_MOBILE_BODY,
);

const mobileDaySubtitleSize = rem(getPrintProp(".mobile-day-subtitle", "font-size"));
assert(
  `.mobile-day-subtitle font-size >= ${MIN_MOBILE_SECONDARY}rem`,
  mobileDaySubtitleSize !== null && mobileDaySubtitleSize >= MIN_MOBILE_SECONDARY,
);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
