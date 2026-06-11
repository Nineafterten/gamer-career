# 🎮 Gamer Career

<!-- TODO (presentation): add example screenshots and link the sample seed lists in `seeds/`
     once the UI has rich data to show off. -->

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

On first run the app starts empty — add games one at a time, paste/upload a list via **Bulk
Add**, or import a JSON backup. Every game defaults to **Not Started**, so you curate your own
statuses, scores, and favorites.

## Features

- **Landing dashboard** — KPI cards (total, unique, in play, backlog, completed, favorites,
  wishlist, repeats, abandoned, average score, completion rate, played this year). Each card
  deep-links into the games view with the matching filter + visualization.
- **Primary games view** — a hero visualization over a filterable/sortable card grid.
  The hero chart changes per view:
  | View | Visualization |
  |------|---------------|
  | All Games | Chronological timeline (release date × public score) |
  | Backlog / In Play / Paused / Wishlist | Breakdown bars by platform or genre (toggle) |
  | Completed & Done With | Your score vs. the public score |
  | Abandoned | Top dislikes that drove you away |
  | Favorites | Genre/series cluster (treemap) |
- **Grid / List views** — toggle the games view between a card grid and a compact list
  (your choice persists).
- **Bulk edit** — hit **Select**, tick records in either view (with a live selected count), then
  edit the whole batch at once: Series, Publisher, Platforms, Genres, Play Status, Likes, Dislikes,
  Noteworthy, Favorite, Exclude from stats, Part of collection, and Variant of. Tag fields support
  **Add / Remove / Replace**; only the fields you switch on are written. The selection can also be
  deleted in one go (confirm-gated).
- **Grouping** — group the games view by None / Series / Genre / Collection / Original, with section
  headers and counts. A **Series** KPI deep-links to the series-grouped view.
- **Collections** — model compilations (e.g. *The Ezio Collection* containing *AC II* +
  *Brotherhood*): mark an entry as a collection, link members to it, and flag members
  **excluded from stats** so they don't double-count.
- **Variants / versions** — link a record to the original game it's a remaster/port/edition of
  (e.g. *Minecraft* across platforms). Each playthrough still counts, but variants collapse onto
  the original for the **Unique** count and surface as **Repeats** — "Group by original" clusters
  them ("Minecraft + 4 repeats").
- **Bulk Add** — paste or upload a CSV/JSON list (`Title, Platform, Play Status`, plus
  optional `Favorite, Score, Series`); review a staging table with **duplicate flagging**
  (against your library and within the batch), optionally fetch metadata, then create.
- **Game entry modal** — create / view / edit / delete a record. Delete always asks for
  confirmation. The **Fetch details** button autofills public info from RAWG (see below).
  Abandoned games can't be scored (the rating clears + locks).
- **Hidden records** — flag a record (e.g. junk Xbox-sync imports, or a game someone else
  logged under your profile) as **Hidden**: it drops out of every list and stat but stays in
  your library, so future syncs recognize it as a duplicate and skip it. Review/unhide them under
  **Manage → Hidden**. Settable per-record or via bulk edit.
- **Settings** — RAWG API key, light/dark/auto theme, JSON export/import, a confirm-gated
  "clear all games", and the app version.

## Play-status model

Status is the granular sub-status; the bucket is derived.

- **Open** — Not Started · Backlog · Wishlist
- **Current** — Active · Passive · Paused
- **Closed** — Completed · Done With · Abandoned

Every status change is timestamped into the record's `statusHistory`, which powers the
played-this-year count.

## Metadata autofill (RAWG)

The "Fetch details" button uses the free [RAWG](https://rawg.io/apidocs) API.

1. Grab a free API key at <https://rawg.io/apidocs>.
2. Paste it in **Settings → Metadata (RAWG)**.
3. In a game entry, type a title and click **Fetch details**, then pick a match.

It fills title, publisher, release date, platforms, genres, and cover art, and resolves the
**reference link to the matching English Wikipedia article** (via Wikipedia's open API).

The **public score** comes from **IGDB's community (gamer) rating** — a trustworthy,
gamer-maintained number from a source with a real API (GameFAQs has none and blocks scrapers,
and RAWG/Metacritic skews unreliable for retro titles). This runs through a small server proxy,
so it works on the deployed site once `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are set (see
DEPLOY.md) — not on the plain dev server, where it falls back to RAWG's Metacritic value or stays
blank for you to fill.

The RAWG key is stored locally in your browser (fine for a personal app; it is *not* included
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
  to the URL just sees an empty app.
- **RAWG key is per device** — it's stored locally, never in the build or exports. Keep the
  canonical key in your password manager and paste it into Settings once per device.

## Versioning

The version shown in Settings comes from `package.json` (injected at build time). Bump it
with `npm version patch|minor|major`.

## Project structure

```
src/
  types/game.ts        # GameEntry, PlayStatus, StatusEvent
  data/                # vocab (statuses, likes…), presets (view↔chart)
  db/                  # Dexie schema, repository (status-transition timestamping), hooks
  lib/                 # rawg client, backup (export/import), stats, bulkImport (parse/dedupe)
  routes/              # Dashboard, GamesView, BulkImport, Settings
  components/          # layout (App shell), kpi, cards, filters, modal, charts, common
  styles via *.module.css colocated with components + src/index.css (globals/tokens)
  test/                # Vitest setup + render helpers; *.test.ts(x) colocated
```

## Tech stack

React 18 · Vite · TypeScript · Mantine v7 (UI + theming) · Recharts (charts) ·
Dexie (IndexedDB) · React Router v6.
