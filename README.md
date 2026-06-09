# 🎮 Gamer Career

A personal dashboard & wiki for tracking your video-game hobby career — record every
game you've played, curate them by play status, and explore your history through
data visualizations. Fully client-side: your data lives in your browser, with a
one-click JSON export for backups.

![Built with React, Vite, TypeScript, Mantine](https://img.shields.io/badge/React-Vite-blueviolet)

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
npm run typecheck  # type-check only
npm run test       # run unit/smoke tests (Vitest, watch mode)
npm run test:run   # run tests once
npm run coverage   # tests + coverage report
```

On first run the app seeds a starter library of 23 games (public info only — every game
defaults to **Not Started** so you curate your own statuses, scores, and favorites).

## Features

- **Landing dashboard** — KPI cards (total, in play, backlog, completed, favorites,
  wishlist, abandoned, average score, completion rate, played this year). Each card
  deep-links into the games view with the matching filter + visualization.
- **Primary games view** — a hero visualization over a filterable/sortable card grid.
  The hero chart changes per view:
  | View | Visualization |
  |------|---------------|
  | All Games | Chronological timeline (release date × public score) |
  | Backlog | Aging bars — how long each has waited |
  | In Play | Aging bars — how long each has been going |
  | Completed & Done With | Your score vs. the public score |
  | Abandoned | Top dislikes + average days held before quitting |
  | Favorites | Genre/series cluster (treemap) |
  | Wishlist | Time-on-wishlist bars |
- **Grid / List views** — toggle the games view between a card grid and a compact list
  (your choice persists).
- **Grouping** — group the games view by None / Series / Genre / Collection, with section
  headers and counts. A **Series** KPI deep-links to the series-grouped view.
- **Collections** — model compilations/remasters (e.g. *The Ezio Collection* containing
  *AC II* + *Brotherhood*): mark an entry as a collection, link members to it, and flag
  members **excluded from stats** so they don't double-count.
- **Bulk Add** — paste or upload a CSV/JSON list (`Title, Platform, Play Status`, plus
  optional `Favorite, Score, Series`); review a staging table with **duplicate flagging**
  (against your library and within the batch), optionally fetch metadata, then create.
- **Game entry modal** — create / view / edit / delete a record. Delete always asks for
  confirmation. The **Fetch details** button autofills public info from RAWG (see below).
- **Settings** — RAWG API key, light/dark/auto theme, JSON export/import, a confirm-gated
  reset / clear, and the app version.

## Play-status model

Status is the granular sub-status; the bucket is derived.

- **Open** — Not Started · Backlog · Wishlist
- **Current** — Active · Passive · Paused
- **Closed** — Completed · Done With · Abandoned

Every status change is timestamped into the record's `statusHistory`. That's what powers
the aging visualizations ("how long in the backlog / in play") and the
played-this-year counts.

## Metadata autofill (RAWG)

The "Fetch details" button uses the free [RAWG](https://rawg.io/apidocs) API.

1. Grab a free API key at <https://rawg.io/apidocs>.
2. Paste it in **Settings → Metadata (RAWG)**.
3. In a game entry, type a title and click **Fetch details**, then pick a match.

It fills title, publisher, release date, platforms, genres, a public score, and cover art.
The key is stored locally in your browser (fine for a personal app; it is *not* included
in exports).

## Data storage & backup

- Records live in **IndexedDB** (via Dexie) — no server, no account.
- **Settings → Export backup** downloads a versioned JSON of all games + settings.
- **Import** restores a backup (Replace all or Merge).
- Export regularly; clearing browser data clears the library.
- **Per-device:** IndexedDB is scoped to each browser, so data does **not** sync across
  devices automatically — use export/import to move it (phone ↔ tablet ↔ desktop).

## Deploy (Netlify)

The app is a static SPA. `netlify.toml` is included (build `npm run build`, publish `dist`,
SPA redirect so client routes survive a refresh) — point Netlify at the repo and it builds.

- `public/robots.txt` + a `noindex` meta keep the personal site out of search engines.
- No auth is needed: your data lives only in your browser, not on the server, so a visitor
  to the URL just sees an empty seeded app.
- **RAWG key is per device** — it's stored locally, never in the build or exports. Keep the
  canonical key in your password manager and paste it into Settings once per device.

## Versioning

The version shown in Settings comes from `package.json` (injected at build time). Bump it
with `npm version patch|minor|major`.

## Project structure

```
src/
  types/game.ts        # GameEntry, PlayStatus, StatusEvent
  data/                # vocab (statuses, likes…), presets (view↔chart), seed.json
  db/                  # Dexie schema, repository (status-transition timestamping), seed, hooks
  lib/                 # rawg client, backup (export/import), stats, bulkImport (parse/dedupe)
  routes/              # Dashboard, GamesView, BulkImport, Settings
  components/          # layout (App shell), kpi, cards, filters, modal, charts, common
  styles via *.module.css colocated with components + src/index.css (globals/tokens)
  test/                # Vitest setup + render helpers; *.test.ts(x) colocated
```

## Tech stack

React 18 · Vite · TypeScript · Mantine v7 (UI + theming) · Recharts (charts) ·
Dexie (IndexedDB) · React Router v6.

## Roadmap (not yet built)

- **Xbox import** for gamertag history via [OpenXBL](https://xbl.io/). Deferred: OpenXBL
  sends no `Access-Control-Allow-Origin`, so a static app can't call it directly — it needs
  a small server-side proxy (a Netlify Function or the Mac Mini) holding the key. Once that
  exists, a manual "Sync from Xbox" button (and later a 24h auto-sync) becomes possible.
- Optional wishlist price signals — no public eShop/Xbox Marketplace price feed, so skipped.
- Nintendo Switch has no public API, so Switch entries stay manual.
- Cross-device sync would require a backend (the Mac Mini is well-suited).
