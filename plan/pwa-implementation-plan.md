# PWA Implementation Plan

Goal: Make Trip Planner installable via iOS "Add to Home Screen" with full offline support.

---

## Phase 1 — Critical (enables offline)

### Task 1.1 — Create `brand.svg`
Create a local SVG at `brand.svg` to replace the external Unsplash image dependency.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 74 56" width="74" height="56">
  <rect width="74" height="56" rx="8" fill="#2f6f73"/>
  <circle cx="37" cy="22" r="10" fill="#ffffff" opacity="0.9"/>
  <circle cx="37" cy="22" r="5" fill="#2f6f73"/>
  <polygon points="37,36 30,24 44,24" fill="#ffffff" opacity="0.9"/>
  <rect x="18" y="40" width="38" height="4" rx="2" fill="#ffffff" opacity="0.4"/>
  <rect x="23" y="46" width="28" height="3" rx="1.5" fill="#ffffff" opacity="0.25"/>
</svg>
```

---

### Task 1.2 — Replace Unsplash `<img>` src in `index.html`

Find:
```html
          <img
            class="brand-image"
            alt=""
            src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=240&q=70"
          />
```

Replace with:
```html
          <img
            class="brand-image"
            alt=""
            src="brand.svg"
          />
```

---

### Task 1.3 — Add new assets to ASSETS list in `sw.js`

Find:
```js
  "./icon-512.png",
```

Replace with:
```js
  "./icon-512.png",
  "./brand.svg",
  "./offline.html",
```

---

### Task 1.4 — Create `offline.html`

Create the file with this exact content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Trip Planner — Offline</title>
    <meta name="theme-color" content="#ffffff" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        background: #f7f8fa;
        color: #1f2933;
        text-align: center;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        background: #ffffff;
        border-radius: 8px;
        padding: 40px 32px;
        max-width: 360px;
        box-shadow: 0 18px 45px rgba(31, 41, 51, 0.08);
      }
      h1 { font-size: 1.25rem; margin: 0 0 8px; }
      p  { margin: 0 0 24px; color: #6b7280; font-size: 0.95rem; }
      a  {
        display: inline-block;
        background: #2f6f73;
        color: #ffffff;
        text-decoration: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 0.95rem;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>You're offline</h1>
      <p>Trip Planner needs a connection the first time it loads. Once loaded, it works fully offline. Please reconnect and try again.</p>
      <a href="./">Try again</a>
    </div>
  </body>
</html>
```

---

### Task 1.5 — Update fetch handler in `sw.js` to serve `offline.html` on failure

Find:
```js
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
```

Replace with:
```js
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).catch(() =>
        caches.match("./offline.html")
      );
    })
  );
});
```

---

## Phase 2 — Quality (update strategy + error handling)

### Task 2.1 — Bump cache version and notify clients on activation in `sw.js`

Find:
```js
const CACHE = "trip-planner-v1";
```

Replace with:
```js
const CACHE = "trip-planner-v2";
```

Then find:
```js
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
```

Replace with:
```js
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.matchAll({ type: "window" })).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
    })
  );
  self.clients.claim();
});
```

---

### Task 2.2 — Add update banner to `index.html`

Find:
```html
    <div class="app-shell">
```

Replace with:
```html
    <div id="updateBanner" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#2f6f73;color:#ffffff;text-align:center;padding:12px 16px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;font-size:0.95rem;">
      Update available — <button onclick="window.location.reload()" style="background:#ffffff;color:#2f6f73;border:none;border-radius:4px;padding:4px 12px;font-size:0.9rem;cursor:pointer;margin-left:8px;">Refresh now</button>
    </div>
    <div class="app-shell">
```

---

### Task 2.3 — Improve SW registration in `app.js`

Find:
```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
```

Replace with:
```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { scope: "./" })
    .then((reg) => {
      console.log("[SW] Registered, scope:", reg.scope);
    })
    .catch((err) => {
      console.error("[SW] Registration failed:", err);
    });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED") {
      const banner = document.getElementById("updateBanner");
      if (banner) banner.style.display = "block";
    }
  });
}
```

---

## Phase 3 — Polish (icons, manifest, favicon)

### Task 3.1 — Add `"purpose": "any maskable"` to `manifest.json`

Replace the entire file content with:

```json
{
  "name": "Trip Planner",
  "short_name": "Trip Planner",
  "description": "Pre-trip planning workspace",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

### Task 3.2 — Add 512px favicon link to `index.html`

Find:
```html
    <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png" />
```

Replace with:
```html
    <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="icon-512.png" />
```

---

## Execution Order

| # | File | Action |
|---|------|--------|
| 1 | `brand.svg` | Create (Task 1.1) |
| 2 | `offline.html` | Create (Task 1.4) |
| 3 | `index.html` | Three edits in one pass: Tasks 1.2, 2.2, 3.2 |
| 4 | `sw.js` | Four edits in one pass: Tasks 1.3, 1.5, 2.1 |
| 5 | `app.js` | Replace SW registration (Task 2.3) |
| 6 | `manifest.json` | Rewrite with purpose field (Task 3.1) |
