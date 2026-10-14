# Deploy & setup runbook

The app is a static SPA plus two tiny proxies (Xbox and IGDB), served together by one
Cloudflare Worker named `gamer-career` at https://gamer-career.nineafterten.com.
`wrangler.jsonc` sends `/api/*` to `worker/index.mjs` and everything else to the build in `dist/`.

## 0. Prerequisites
- Node 18+ and npm.
- A Cloudflare account with the GitHub app allowed to read this repo.
- (Optional, for autofill) a free [RAWG](https://rawg.io/apidocs) API key.
- (Optional, for Xbox sync) a free [OpenXBL](https://xbl.io) key, authorized with your Xbox
  account.
- (Optional, for gamer scores) a free [Twitch developer app](https://dev.twitch.tv/console/apps)
  — its Client ID + Secret authorize the IGDB API behind "Fetch details".

## 1. Connect the build (one time)

Cloudflare builds and deploys from GitHub on every push to `main`:

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → this repo.
2. Build command `npm run build`, deploy command `npx wrangler deploy`.
3. **Settings → Domains & Routes → Add → Custom domain:** `gamer-career.nineafterten.com`.

Don't `wrangler deploy` by hand; let the GitHub build do it so what's live always matches a commit.

## 2. Configure the keys
Cloudflare dashboard → **gamer-career → Settings → Variables and Secrets**, add each as a
**Secret** (they take effect without a rebuild):
- **Xbox sync:** `OPENXBL_KEY`. Until it's set, "Sync from Xbox" shows a friendly
  "not configured" message — nothing else breaks.
- **IGDB scores:** create a free app at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
  (any name; OAuth redirect can be `http://localhost`), then add `TWITCH_CLIENT_ID` and
  `TWITCH_CLIENT_SECRET`. "Fetch details" then fills the public score from IGDB's community
  (gamer) rating. Until set, scores fall back to RAWG's Metacritic value (or stay blank).
- **RAWG autofill:** the RAWG key is entered **per device** in the app (Settings → Metadata),
  not on the Worker. Keep the canonical key in your password manager and paste it on each device.

## 3. Use it
- Open the production URL on your phone/tablet/desktop. Each device keeps its own data
  (IndexedDB is per-browser **and per address**) — use **Settings → Export/Import** to move data
  between devices, or to a new address.
- **Backups:** export a JSON backup regularly; clearing browser data clears the library.

## Local development
```bash
npm run dev                      # Vite only — the proxies are NOT available here
npm run build && npx wrangler dev   # the Worker + build, proxies included; reads keys from .env
```

## The old Netlify address
`gamer-career.netlify.app` only redirects now. `netlify-redirect/_redirects` sends every path to
the new address; it was deployed once with
`netlify deploy --prod --no-build --dir netlify-redirect --site gamer-career`.

## Notes
- The proxies (`worker/xbox.mjs`, `worker/igdb.mjs`) are stateless — they forward requests with
  the Worker's secrets and store no data. Both run only on the deployed site or under
  `wrangler dev`, not the plain `npm run dev` server.
- If "Sync from Xbox" returns 0 titles, confirm `getTitleHistory()` in `src/lib/openxbl.ts`
  uses the title-history path your OpenXBL plan exposes (the proxy is generic, so it's a
  one-line change).
- No auth is configured: there's no server-side data to protect (your library lives only in
  your browser). `robots.txt` + a `noindex` meta keep the site out of search results.
