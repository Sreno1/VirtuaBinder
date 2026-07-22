# VirtuaBinder

A local-first, browser-based app for scanning, organizing, and reliving physical memorabilia binders — concert tickets, trading cards, event stubs, photos, and more — as an interactive digital binder.

Scan (or photograph) the pages of a physical binder, drop the images in, and VirtuaBinder slices each page into individually clickable items using a reusable grid template ("stencil"). Every item gets its own metadata (title, date, location, people, notes) and can carry a front/back scan plus an auxiliary photo gallery. Flip through the collection as two-page spreads, drop pins on a map by location, and export/import the whole thing as a single portable JSON file.

**[Live demo](https://sreno1.github.io/VirtuaBinder/)**

[![CI](https://github.com/Sreno1/VirtuaBinder/actions/workflows/ci.yml/badge.svg)](https://github.com/Sreno1/VirtuaBinder/actions/workflows/ci.yml)
[![Deploy](https://github.com/Sreno1/VirtuaBinder/actions/workflows/deploy.yml/badge.svg)](https://github.com/Sreno1/VirtuaBinder/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A written breakdown of the tech stack and engineering decisions behind this project lives in [PORTFOLIO.md](PORTFOLIO.md).

## Features

- **PDF / image / ZIP import** — drop in scanned PDFs (multi-page supported), standalone JPG/PNG/WebP images, or a ZIP of any mix, and render them into the media library.
- **Stencils (page templates)** — define a reusable grid of item slots (e.g. a 3×3 trading-card page or a 2×2 photo sleeve) and apply it to any binder page. Slots can be drawn freehand, resized, and repositioned.
- **Per-item metadata** — title, date, location (with autocomplete against a bundled city dataset), other people present, and freeform notes for every slot or standalone ("loose") item.
- **Crop tool** — pull an item's front/back straight out of a full-page scan without leaving the app.
- **Photo gallery** — attach one or more auxiliary photos to any item, viewable in a full-screen lightbox with keyboard/click navigation between images.
- **Two-page preview mode** — flip through the binder as single pages or spreads, with an optional overlay of item boundaries.
- **Interactive map** — every item with a location drops a pin on a zoomable map of North America; click a pin to open that item.
- **Flip-card item viewer** — click any item to open a full-screen, flippable front/back "ticket" view with its metadata and gallery.
- **Local-first persistence** — the entire project (scans, templates, pages, items) auto-saves to the browser's IndexedDB. Nothing is uploaded anywhere.
- **Portable backups** — export the whole project as a single JSON file (images included, base64-encoded) and re-import it on any device/browser.

## Privacy & data

VirtuaBinder has **no backend and no accounts**. Everything — including every scanned image — is stored entirely in your browser's IndexedDB. The only network request the app makes on its own is fetching map tiles from the public OpenStreetMap tile server when you open the Map tab. Nothing else leaves your machine unless you explicitly export a JSON file yourself.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (ships with Node)

### Install & run

```bash
git clone https://github.com/Sreno1/VirtuaBinder.git
cd VirtuaBinder
npm install
npm run dev
```

The dev server starts at `http://127.0.0.1:5173`.

### Other scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot module reload. |
| `npm run build` | Type-check and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run check` | Run `svelte-check` across the project (TypeScript + Svelte template diagnostics). |

## Usage guide

VirtuaBinder is organized into five tabs:

### 1. Booklet

The main editing workspace.

- **Media library** (top panel) — every imported scan lives here. Click **Import media** to bring in a PDF, image, or ZIP; the import review lets you tag each page as a *binder page scan* or an *item scan*, mark front/back sides, and optionally crop item faces before committing.
- **Pages list** (left panel) — add empty binder pages, reorder them by drag or with the arrow buttons, and insert standalone ("loose") items between pages.
- **Page editor** (center panel) — assign front/back scans to the active page, pick a stencil, and click any slot boundary drawn over the page image to select the item living in that slot.
- **Item details** (right panel) — edit the selected item's title, date, location, people, and notes; assign or crop its front/back image; and build its photo gallery under **Gallery → Add photos**.

### 2. Stencils

Design and manage page templates. Start from a preset (3×3 grid, 2×2 photo sleeve, or blank), then draw, drag, and resize slots directly on a reference scan. Stencils are reusable across any number of binder pages.

### 3. Preview

Flip through the finished binder. Toggle **Single**/**Double** page view and show/hide item boundary borders. Click any item to open it full-screen in the flip-card viewer described below.

### 4. Map

Every item with a location drops a pin on a zoomable map. Click a pin (or an item in the side list) to open that item.

### 5. Data

Backup and restore. **Export JSON** downloads the entire project — templates, pages, items, and every scan image — as one portable file. **Import JSON** restores from that file (including on a different browser or machine). **Clear browser copy** wipes the local IndexedDB copy after confirmation.

### The item viewer (flip-card / "shadowbox")

Clicking an item anywhere in the app (Booklet, Preview, or Map) opens a full-screen viewer: drag, swipe, or press <kbd>Enter</kbd> to flip between front and back, click the pencil icon to edit the item's fields inline, and click any gallery thumbnail to open it in a navigable full-screen lightbox (arrow keys or on-screen arrows move between photos).

## Project structure

```
src/
├── App.svelte                # Tab shell + top-level layout
├── main.ts                   # Entry point
├── location-cities.json      # Bundled city dataset for location autocomplete
└── lib/
    ├── components/            # Svelte UI components (one per tab/modal/widget)
    │   └── ui/                 # Small shared UI primitives (Panel, Field, IconButton, ...)
    ├── domain/                 # Pure, framework-free business logic
    │   ├── project.ts           # AppState shape, defaults, migrations
    │   ├── templates.ts         # Stencil presets
    │   ├── geometry.ts          # Slot positioning math (incl. preview-only ring offset)
    │   ├── preview.ts           # Page-side / spread pairing for the Preview tab
    │   ├── crops.ts             # Canvas-based image cropping
    │   ├── locations.ts         # City search + map pin grouping
    │   ├── items.ts             # Display-string helpers (fallbacks for empty fields)
    │   ├── scans.ts             # Scan asset labeling helpers
    │   └── id.ts                 # uid/clamp/round utilities
    ├── services/                # Side-effecting I/O boundaries
    │   ├── importScans.ts        # PDF/image/ZIP → rasterized ScanAsset pipeline
    │   ├── exportJson.ts         # Backup export/import
    │   └── storage.ts            # IndexedDB persistence
    ├── state/
    │   └── binderStore.ts        # Single Svelte store: all app state + mutations
    └── types.ts                 # Shared TypeScript types
```

`domain/` holds no Svelte imports and no I/O — it's plain, unit-testable TypeScript. `services/` is the only place that touches the filesystem-equivalent APIs (Canvas, IndexedDB, File). `state/binderStore.ts` is the single source of truth every component reads from and dispatches actions to.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI framework | **Svelte 5** | Compiles away at build time — no runtime framework overhead, and its built-in reactivity (`$:`) maps cleanly onto a single-store architecture without needing a separate state library. |
| Language | **TypeScript** | A single `AppState` type is threaded through the entire app — domain functions, the store, and every component prop are checked against it, which matters a lot in a schema that's evolved incrementally (see *Schema evolution* below). |
| Build tool | **Vite** | Native ESM dev server, instant HMR, and first-class dynamic `import()` support — used deliberately to keep `pdf.js` and `JSZip` out of the initial bundle. |
| Styling | **Tailwind CSS** | Utility classes kept the component files self-contained (no parallel `.css` file per component) and made the dark, ticket/binder-inspired visual language fast to iterate on. |
| Maps | **Leaflet** + OpenStreetMap tiles | No API key, no billing account, no vendor lock-in — appropriate for a project with zero backend and zero budget. |
| PDF rendering | **pdf.js** | Mozilla's PDF renderer runs entirely client-side via a Web Worker, rasterizing scanned PDF pages to `<canvas>` without ever sending the file anywhere. |
| Archive handling | **JSZip** | Lets a user drop in a ZIP of mixed scans (PDFs + images) and have every entry extracted and processed in one import pass. |
| Drag & drop | **svelte-dnd-action** | Page reordering in the Booklet tab. |
| Persistence | **IndexedDB** (native) | The only storage mechanism that can hold the volume of base64 image data a real binder produces — `localStorage`'s ~5MB quota isn't close to enough. |

## Architecture

The codebase is split into four layers with a strict dependency direction:

```
components/  →  state/  →  domain/
                    ↓
                services/
```

- **`domain/`** is plain, framework-free TypeScript — no Svelte imports, no I/O. Slot positioning math, template presets, display-string fallbacks, and location search all live here and are trivially unit-testable in isolation.
- **`services/`** is the only layer allowed to touch a browser I/O API: `importScans.ts` wraps Canvas/File/pdf.js/JSZip, `storage.ts` wraps IndexedDB, `exportJson.ts` wraps Blob/download.
- **`state/binderStore.ts`** is a single Svelte store holding the entire app: the project data (`AppState`) and all transient UI state (active tab, selection, modal visibility) in one place. Every mutation is a named method on `binderStore` — components never mutate state directly, they call an action and re-render off the store subscription.
- **`components/`** are presentation-only: they read from the store with `$binderStore` and call store methods on interaction. No component holds business logic that isn't purely local UI state (e.g. a drag gesture's in-progress pointer position).

This separation is what made it possible to fix layout/positioning bugs (below) by editing a single pure function in `domain/geometry.ts` with total confidence about what else it could affect.

**Client-side PDF/ZIP ingestion pipeline.**
Import supports single images, multi-page PDFs, and ZIPs containing any mix of both — all rasterized in-browser. PDFs are rendered page-by-page through `pdf.js` onto an off-screen canvas, downscaled to a max dimension, and re-encoded as JPEG at a fixed quality before being handed to the rest of the app as a plain `image: string` data URL — keeping every downstream component (which just needs `<img src>`) completely unaware of where the bytes came from.

**Schema evolution without a migration system.**
`AppState` has grown fields over time (item `kind`, item `gallery`) without a formal migration framework. Every load path funnels through a single `normalizeProject()` function that backfills missing fields with sane defaults, so older exported JSON files and older IndexedDB snapshots keep working after a schema change without the user ever noticing.

## Contributing

This started as a personal project, but issues and pull requests are welcome. For anything non-trivial, please open an issue first to discuss the change.

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, for the map tiles
- [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla), for in-browser PDF rendering
- [Leaflet](https://leafletjs.com/), [Lucide](https://lucide.dev/), [Tippy.js](https://atomiks.github.io/tippyjs/), and [JSZip](https://stuk.github.io/jszip/)

## License

[MIT](LICENSE) © Steven Lykins
