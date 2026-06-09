# Gamer Career — project guide (for future sessions)

A personal "video-game career" dashboard/wiki: record every game you've played, curate by play
status, and explore the library through data visualizations. **Fully client-side** React SPA +
one tiny serverless function (the Xbox proxy). Deployed on Netlify.

> Quick context for Claude: this is a finished, shipped app. Read this file first, then the
> relevant `src/` files. Match existing patterns. Run `npm run test` + `npm run build` before
> calling anything done, and verify UI changes in the browser preview.

## Run / build / test / deploy
```bash
npm install
npm run dev        # Vite dev server — the Xbox proxy is NOT available here
netlify dev        # Vite + the function; needs a local .env with OPENXBL_KEY
npm run build      # tsc -b + vite build (must be clean)
npm run test       # Vitest (watch); test:run / coverage / typecheck also available
```
Deploy: see `DEPLOY.md` (`netlify deploy --build --prod`; set `OPENXBL_KEY` env var in Netlify).
No GitHub required to deploy — local git is just version history.

## Stack & architecture
- React 18 · Vite · TypeScript · Mantine v7 (UI/theming) · Recharts · Dexie/IndexedDB ·
  React Router v6. One Netlify Function (Node) for the Xbox proxy.
- **Storage:** data lives only in the browser (IndexedDB), **per device**. JSON export/import
  (Settings) is the backup. No accounts, no server database. RAWG key is entered per device.
- **Layout:**
  - `src/types/game.ts` — `GameEntry`, `PlayStatus`, `StatusEvent`, `AppSettings`, `BackupFile`.
  - `src/data/` — `vocab.ts` (statuses/buckets/likes), `presets.ts` (view↔chart↔filter map +
    `needsReview`).
  - `src/db/` — `database.ts` (Dexie schema + settings), `repository.ts` (CRUD +
    status-transition timestamping + sourceTitle logic), `hooks.ts` (useLiveQuery).
  - `src/lib/` — `stats.ts` (KPIs, repeats, histogram), `backup.ts`, `rawg.ts`, `bulkImport.ts`
    (parse/dedupe/canonTitle), `openxbl.ts` (Xbox client).
  - `src/routes/` — `Dashboard`, `GamesView`, `BulkImport`, `Settings`.
  - `src/components/` — `layout` (App shell), `kpi`, `cards`, `filters`, `modal`, `charts`, `common`.
  - `netlify/functions/xbox.mjs` — the OpenXBL proxy.

## Domain model
- **PlayStatus** (9) in 3 buckets: Open (not_started/backlog/wishlist), Current
  (active/passive/paused), Closed (completed/done_with/abandoned). Bucket derived from `vocab.ts`.
- Every status change is appended to `statusHistory` → powers played-this-year. (Manual
  start/end/duration fields were removed — impractical for a retroactively curated library.)
- **Repeats** = distinct titles present both standalone and as a collection member (matched by
  `canonTitle`); computed in `stats.ts` from the *unfiltered* library so excluded members count.
- **Presets** are 1:1 per status (In Play = active+passive only; Paused, Completed, Done With
  separate). `needs_review` = completed/done_with missing a personal score.
- **Collections:** `isCollection` / `collectionId` / `excludeFromStats` (e.g. Ezio Collection ⊃
  AC2/Brotherhood; excluded members don't double-count in KPIs).
- **`sourceTitle`** = the original imported title, preserved across metadata rewrites — the
  stable key for duplicate detection.

## Conventions & gotchas
- **Styling:** Mantine components + per-component **CSS Modules** + `src/index.css`
  globals/tokens (`.interactive-card`, `--gc-card-placeholder`). NO scattered inline styles
  (only exception: `ErrorBoundary` fallback). **Never Tailwind** (owner preference).
- **Dedupe:** `flagDuplicates` matches normalized title against BOTH `title` and `sourceTitle`;
  platforms are intentionally ignored (they drift). `canonTitle` (number-words/roman→digits,
  drops `(year)`/punctuation) gates metadata auto-apply; loose matches are flagged, not applied.
- **Charts:** themed tooltips via `HeroChart.module.css` + Recharts item/label styles; the
  Backlog/In Play/Paused/Wishlist views share a Platform/Genre breakdown toggle and the rating
  view a Compare(scatter)/Distribution(histogram) toggle; hero card is `role="img"`.
- **Perf:** routes are `React.lazy` + Suspense; `vite.config.ts` `manualChunks` splits
  react/mantine/recharts/dexie (Recharts only loads on games views).
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
