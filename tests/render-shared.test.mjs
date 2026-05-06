// Tests for shared rendering helpers.
// Run with: node tests/render-shared.test.mjs

globalThis.localStorage = {
  getItem() {
    return null;
  },
  setItem() {},
};

const { renderPeopleBadge } = await import("../js/render-shared.js");

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  OK ${description}`);
    passed++;
  } else {
    console.error(`  FAIL ${description}`);
    failed++;
  }
}

console.log("\nrenderPeopleBadge");

assert(
  "renders all selected people",
  renderPeopleBadge({ people: ["Alex", "Mina", "Sam"] }) === '<span class="item-people">Alex, Mina, Sam</span>',
);

assert(
  "omits empty people markup",
  renderPeopleBadge({ people: [] }) === "",
);

assert(
  "filters blank people values",
  renderPeopleBadge({ people: ["Alex", " ", "Mina"] }) === '<span class="item-people">Alex, Mina</span>',
);

assert(
  "escapes people and class names",
  renderPeopleBadge({ people: ['A&B', '<Mina>'] }, { className: 'span-people "wide"' }) === '<span class="span-people &quot;wide&quot;">A&amp;B, &lt;Mina&gt;</span>',
);

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
