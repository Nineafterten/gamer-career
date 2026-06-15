# Gamer Career — project guide (for future sessions)

A personal "video-game career" dashboard/wiki: record every game you've played, curate by play
status, and explore the library through data visualizations. **Fully client-side** React SPA +
two tiny serverless functions (the Xbox + IGDB proxies). Deployed on Netlify.

> Quick context for Claude: this is a finished, shipped app. Read this file first, then the
> relevant `src/` files. Match existing patterns. Run `npm run test` + `npm run build` before
> calling anything done, and verify UI changes in the browser preview.

## Run / build / test / deploy
```bash
npm install
npm run dev        # Vite dev server — the proxies are NOT available here (scores/sync fall back)
netlify dev        # Vite + the functions; needs a local .env (OPENXBL_KEY + Twitch creds)
npm run build      # tsc -b + vite build (must be clean)
npm run test       # Vitest (watch); test:run / coverage / typecheck also available
```
Deploy: see `DEPLOY.md` (`netlify deploy --build --prod`; set `OPENXBL_KEY` +
`TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` env vars in Netlify).
No GitHub required to deploy — local git is just version history.

## Stack & architecture
- React 18 · Vite · TypeScript · Mantine v7 (UI/theming) · Recharts · Dexie/IndexedDB ·
  React Router v6. Two Netlify Functions (Node): the Xbox + IGDB proxies.
- **Storage:** data lives only in the browser (IndexedDB), **per device**. JSON export/import
  (Settings) is the backup. No accounts, no server database. RAWG key is entered per device.
- **Layout:**
  - `src/types/game.ts` — `GameEntry`, `PlayStatus`, `StatusEvent`, `AppSettings`, `BackupFile`.
  - `src/data/` — `vocab.ts` (statuses/buckets/likes), `presets.ts` (view↔chart↔filter map +
    `needsReview`).
  - `src/db/` — `database.ts` (Dexie schema + settings), `repository.ts` (CRUD +
    status-transition timestamping + sourceTitle logic + `applyBulkEdit`/`deleteGames`),
    `hooks.ts` (useLiveQuery).
  - `src/lib/` — `stats.ts` (KPIs, repeats, histogram), `bulkEdit.ts` (pure `computeBulkPatch`/
    `applyTagEdit` for multi-record edits), `labels.ts` (like/dislike label resolution +
    rename/delete cascade), `backup.ts`, `rawg.ts` (metadata; Metacritic-only score
    fallback), `igdb.ts` (gamer `getPublicScore` via the proxy), `wikipedia.ts` (resolve a reference
    article), `bulkImport.ts` (parse/dedupe/canonTitle), `openxbl.ts` (Xbox client).
  - `src/routes/` — `Dashboard`, `GamesView`, `BulkImport`, `ManageLabels`, `Settings`.
  - `src/components/` — `layout` (App shell), `kpi`, `cards`, `filters`, `modal`, `charts`, `common`.
  - `netlify/functions/` — `xbox.mjs` (OpenXBL proxy) + `igdb.mjs` (IGDB proxy, Twitch-app token).

## Domain model
- **PlayStatus** (9) in 3 buckets: Open (not_started/backlog/wishlist), Current
  (active/passive/paused), Closed (completed/done_with/abandoned). Bucket derived from `vocab.ts`.
- Every status change is appended to `statusHistory` (status timeline). Manual
  start/end/duration fields were removed — impractical for a retroactively curated library;
  the old "Played this year" KPI was dropped for the same reason (the helpers
  `inPlaySince`/`closedAt` in `stats.ts` remain, just unused by any KPI).
- **Variants** = alternate editions of the SAME game (remaster/port/HD). A record points at its
  canonical original via `variantOfId` (distinct from collections, which bundle *different* games;
  the two can co-exist). `repeats` KPI = count of variant records; `unique` KPI = total − variants.
- **Presets** are 1:1 per status (In Play = active+passive only; Paused, Completed, Done With
  separate). `needs_review` = a data-hygiene union: missing personal score (finished games),
  missing cover art (any record), or an abandoned game with no dislike reason. `ReviewChart`
  breaks the count down per reason (`needsScore`/`needsArt`/`needsAbandonReason` in `presets.ts`).
- **Collections:** `isCollection` / `collectionId` / `excludeFromStats` (e.g. Ezio Collection ⊃
  AC2/Brotherhood; excluded members don't double-count in KPIs). Variants (`variantOfId`) are a
  separate axis — same game, different edition — and can group via "Group by original".
- **`hidden`** = excluded from every list (only the `hidden` preset shows them) and every stat,
  but kept in the DB so `flagDuplicates` skips it on re-sync. Set via modal/bulk edit; nav under
  Manage → Hidden. Abandoned games can't be scored (modal clears + locks the rating; bulk-abandon
  clears it too). Metadata: RAWG fills title/cover/genres/etc.; the **public score** comes from
  IGDB's gamer rating (`igdb.ts` → `/api/igdb` proxy, Twitch-app creds; RAWG Metacritic is the
  fallback), and the reference link resolves via `wikipedia.ts` (opensearch) — both in the apply flows.
  The edit form also has a **manual IGDB-lookup button** beside the Public Score input (opens an
  IGDB search in a new tab) for copying a score by hand when the auto-fetch is unavailable.
- **Labels:** like/dislike tags are plain strings stored on each record (the text *is* the identity
  — no IDs). Manage → Labels (`ManageLabels` + `lib/labels.ts`) renames/deletes them by cascading
  across every record; the authoritative picker list materializes into
  `settings.likeLabels`/`dislikeLabels` on first edit (defaults + custom + in-use), so a renamed or
  deleted default doesn't resurface. `resolve{Like,Dislike}Labels` is the single source the form +
  bulk-edit pickers read; new labels typed in a form go through `registerNewLabels`.
- **`sourceTitle`** = the original imported title, preserved across metadata rewrites — the
  stable key for duplicate detection.
- **Bulk edit:** `GamesView` "Select" mode toggles checkboxes on cards/rows + a fixed selection
  bar; `BulkEditModal` builds a `BulkEditSpec` (only switched-on fields) applied via
  `applyBulkEdit`. Tag fields support add/remove/replace; status changes append a StatusEvent.

## Conventions & gotchas
- **Styling:** Mantine components + per-component **CSS Modules** + `src/index.css`
  globals/tokens (`.interactive-card`, `--gc-card-placeholder`). NO scattered inline styles
  (only exception: `ErrorBoundary` fallback). **Never Tailwind** (owner preference).
- **Dedupe:** `flagDuplicates` matches normalized title against BOTH `title` and `sourceTitle`;
  platforms are intentionally ignored (they drift). `canonTitle` (number-words/roman→digits,
  drops `(year)`/punctuation) gates metadata auto-apply; loose matches are flagged, not applied.
- **Charts:** themed tooltips via `HeroChart.module.css` + Recharts item/label styles; the
  Backlog/In Play/Paused/Wishlist views share a Platform/Genre breakdown toggle and the rating
  view a Compare(scatter)/Distribution(histogram) toggle; the All-Games/timeline scatter colors
  dots per play-status (one `<Scatter>` + legend entry per status); hero card is `role="img"`.
- **Perf:** routes are `React.lazy` + Suspense; `vite.config.ts` `manualChunks` splits
  react/mantine/recharts/dexie (Recharts only loads on games views). `GamesView` caps how many
  cards/rows mount (`INITIAL_RENDER`, with Load more / Show all); cover images use native
  `loading="lazy"` + `decoding="async"`.
- **Tests:** Vitest; `src/test/setup.ts` polyfills (node Blob/File, fake-indexeddb, matchMedia,
  ResizeObserver); `*.test.ts(x)` colocated; test files excluded from the production `tsc` build.
- **Dev helper:** `window.gc` (db + repository fns) exists in dev only (`import.meta.env.DEV`),
  stripped from prod builds.
- Version shown in Settings comes from `package.json` (Vite `define`); bump with `npm version`.

## Xbox sync — the hard-won working config
The proxy (`netlify/functions/xbox.mjs`) forwards a whitelisted `/api/v2/*` path. Pitfalls
(all solved — don't regress):
- Host is **`https://xbl.io`** (NOT `api.xbl.io`, which 404s everything).
- Must send **`Accept-Language: en-US`** (Xbox titlehub rejects `*`).
- OpenXBL wraps responses in **`{ content, code }`** — unwrap it.
- Title history path is **`/api/v2/player/titleHistory/{xuid}`**; the xuid comes from
  `/api/v2/account` → `content.profileUsers[0].id`.
- `OPENXBL_KEY` is a **Netlify env var** (never in client/code). CORS is moot because the
  browser calls the same-origin `/api/xbox` redirect.
- Flow: Settings → "Sync from Xbox" → `getTitleHistory()` → `titleHistoryToRows()` → handed to
  Bulk Add staging (via `sessionStorage['gc-bulk-prefill']`) for dedupe + review + create.
  Manual only (24h auto-sync would need a cron).

## Out of scope / future ideas
Cross-device live sync (needs a backend), Nintendo Switch import (no public API), 24h Xbox
auto-sync, a dedupe/merge tool for already-duplicated records, CSV export.

## Key decisions (why)
- Per-device storage + export/import over a backend (owner chose simplicity).
- Completed / Done With kept as separate 1:1 status views.
- Xbox import via a stateless Netlify Function proxy (fixes CORS + hides the key, keeps data client-side).
- Public score from **IGDB's gamer `rating`** (via the same proxy pattern): GameFAQs — the owner's
  preferred source — has no API and 403s scrapers, and RAWG/Metacritic skews unreliable for retro
  games. IGDB is the gamer-maintained number with a real API. RAWG Metacritic remains the fallback.
