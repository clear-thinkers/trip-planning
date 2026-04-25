# URL Sharing Implementation Plan

## Goal

Encode a trip into a compressed URL so the user can share a link. When the recipient opens the link, the app reads the URL and loads the trip automatically.

---

## Approach Overview

1. Serialize the trip to JSON
2. Compress with the native `CompressionStream` API (`deflate-raw`)
3. Base64url-encode the compressed bytes
4. Append as a URL hash fragment: `#trip=<encoded>`
5. On app load, detect the `#trip=` hash, decode/decompress, and import the trip

No new dependencies — `CompressionStream`/`DecompressionStream` are built into all modern browsers (Chrome 80+, Firefox 113+, Safari 16.4+).

---

## URL Format

```
https://your-domain/#trip=<base64url-encoded-compressed-json>
```

Using a **hash fragment** (not a query param) because:
- Not sent to any server
- Purely client-side
- Works with service worker cache-first strategy without route changes

---

## Size Considerations

| Trip size | Raw JSON | Compressed | Base64url |
|-----------|----------|------------|-----------|
| Small (10 items) | ~5 KB | ~1.5 KB | ~2 KB |
| Medium (50 items) | ~25 KB | ~7 KB | ~10 KB |
| Large (150+ items) | ~80 KB | ~22 KB | ~30 KB |

Modern browsers support URLs up to ~2 MB — this is fine for direct links. SMS/iMessage may truncate beyond ~2 KB. The share flow should warn if the URL exceeds ~4 KB.

---

## New File: `js/share.js`

Exports four functions:

```js
// Compress trip → base64url string (async)
export async function compressTrip(trip): Promise<string>

// Decode base64url string → trip object (async)
export async function decompressTrip(encoded): Promise<object>

// Build full shareable URL for the current page (async)
export async function generateShareUrl(trip): Promise<string>

// Read URL hash on page load; returns decoded trip or null (async)
export async function loadTripFromUrl(): Promise<object|null>
```

### Implementation sketch

```js
// js/share.js

async function compress(str) {
  const bytes = new TextEncoder().encode(str);
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function decompress(encoded) {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export async function compressTrip(trip) {
  return compress(JSON.stringify(trip));
}

export async function generateShareUrl(trip) {
  const encoded = await compressTrip(trip);
  const base = window.location.href.split("#")[0];
  return `${base}#trip=${encoded}`;
}

export async function loadTripFromUrl() {
  const hash = window.location.hash;
  if (!hash.startsWith("#trip=")) return null;
  const encoded = hash.slice(6);
  try {
    const json = await decompress(encoded);
    return JSON.parse(json);
  } catch {
    return null;  // Corrupt or truncated URL — silently ignore
  }
}
```

---

## Files to Modify

### 1. `app.js` — detect shared trip on startup

In the `DOMContentLoaded` handler, **before** calling `render()`:

```js
import { loadTripFromUrl } from "./js/share.js";
import { normalizeTrip } from "./js/state.js";   // already exported
import { createId, getUniqueTripTitle } from "./js/format.js";

// inside DOMContentLoaded:
const sharedTrip = await loadTripFromUrl();
if (sharedTrip) {
  const trip = normalizeTrip(sharedTrip);
  trip.id = createId();
  trip.title = getUniqueTripTitle(trip.title);
  state.store.trips.push(trip);
  state.store.activeTripId = trip.id;
  state.screen = "workspace";
  // Clear hash so reloads don't re-import
  history.replaceState(null, "", window.location.pathname);
}
```

> Note: `getUniqueTripTitle` is already used in `importTrip()` — confirm it's exported from `format.js` or move the de-dup logic there.

### 2. `render-views.js` — add Share button

In `renderTripSettings()` (or the controls view), add a **Copy Share Link** button. It should:
- Call `generateShareUrl(state.trip)`
- Copy result to clipboard via `navigator.clipboard.writeText(url)`
- Show a brief toast/inline confirmation ("Link copied!")
- If URL exceeds 4 KB, show a warning: "Link may be too long for SMS — use Export JSON for large trips"

```js
async function shareTrip() {
  const url = await generateShareUrl(state.trip);
  if (url.length > 4096) {
    // show warning toast but still copy
  }
  await navigator.clipboard.writeText(url);
  showToast("Share link copied to clipboard");
}
```

The share button can live in the **controls tab** (alongside Export/Import) or in the **trip settings header**. Controls tab is lower friction to implement (no layout changes needed).

### 3. `init.js` — bind share button click

```js
els.shareBtn?.addEventListener("click", shareTrip);
```

### 4. `index.html` — add share button element

In the controls section (near the existing export/import buttons):

```html
<button id="shareBtn" class="btn btn-secondary">Copy Share Link</button>
```

Or it can be rendered dynamically in `renderControls()` like other buttons in that view — no static HTML needed.

### 5. `js/constants.js` — add element ID constant (optional)

If the project uses a constants file for element IDs, add `shareBtn` there.

---

## Toast Notification

The app currently has no toast system. Options:
- **Inline label** next to the button: change button text to "Copied!" for 2 seconds, then revert
- **Simple `<div id="toast">` element** in `index.html`, shown/hidden with CSS `opacity` transition

Inline button label change is the simplest (no new DOM elements, no CSS needed).

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| URL hash is malformed/truncated | `loadTripFromUrl` catches and returns `null` — app loads normally |
| Trip title already exists | `getUniqueTripTitle` deduplicates (same logic as file import) |
| User opens own share link | Creates a duplicate trip (expected — same as re-importing a file) |
| No clipboard API (non-HTTPS) | Catch the error, fall back to `prompt()` showing the URL |
| Large trip (URL > 4 KB) | Warn the user, still copy (they can still share via direct link) |
| `CompressionStream` not supported | Wrap in try/catch, fall back to uncompressed base64url with a size warning |

---

## Implementation Order

1. **Create `js/share.js`** with compress/decompress/generateShareUrl/loadTripFromUrl
2. **Add share button to `renderControls()`** in `render-views.js` (rendered HTML, no static change to index.html needed)
3. **Wire up `shareTrip()` handler** in `render-views.js` (co-located with other control handlers)
4. **Bind button in `init.js`** (or use event delegation already in place)
5. **Hook into app startup in `app.js`** to detect and import shared trip from URL hash
6. **Test**: share a trip, open link in incognito, verify trip loads correctly; test with large trip for size warning

---

## Out of Scope

- Server-side storage or short URLs (stays fully client-side)
- Expiring links
- Sharing only a subset of trip data (always shares full trip)
- Real-time collaboration
