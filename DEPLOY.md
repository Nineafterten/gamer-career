# Deploy & setup runbook

The app is a static SPA plus one tiny serverless function (the Xbox proxy). Everything below
is a one-time setup; after that, deploys are a single command.

## 0. Prerequisites
- Node 18+ and npm.
- A free [Netlify](https://netlify.com) account.
- (Optional, for autofill) a free [RAWG](https://rawg.io/apidocs) API key.
- (Optional, for Xbox sync) a free [OpenXBL](https://xbl.io) key, authorized with the Xbox
  account behind your gamertag (NineAfterTen).

## 1. First deploy
```bash
npm install
npm run build            # sanity check it builds
npm i -g netlify-cli     # if you don't have it
netlify login            # opens the browser to authorize
netlify init             # create/link a Netlify site (pick a name → nineafterten)
netlify deploy --build            # deploy a draft URL to smoke-test
netlify deploy --build --prod     # promote to production
```

## 2. Configure environment + keys
- **Xbox sync:** in the Netlify dashboard → *Site settings → Environment variables*, add
  `OPENXBL_KEY` = your OpenXBL key. Redeploy (`netlify deploy --build --prod`) so the function
  picks it up. Until this is set, "Sync from Xbox" shows a friendly "not configured" message —
  nothing else breaks.
- **RAWG autofill:** the RAWG key is entered **per device** in the app (Settings → Metadata),
  not in env. Keep the canonical key in your password manager and paste it on each device.

## 3. Use it
- Open the production URL on your phone/tablet/desktop. Each device keeps its own data
  (IndexedDB is per-browser) — use **Settings → Export/Import** to move data between them.
- **Backups:** export a JSON backup regularly; clearing browser data clears the library.

## Local development
```bash
npm run dev          # Vite only — the Xbox proxy is NOT available here
netlify dev          # Vite + the function; needs a local .env with OPENXBL_KEY (see .env.example)
```

## Notes
- The Xbox proxy (`netlify/functions/xbox.mjs`) is stateless — it only forwards OpenXBL
  requests with the server-side key; it stores no data.
- If "Sync from Xbox" returns 0 titles, confirm `getTitleHistory()` in `src/lib/openxbl.ts`
  uses the title-history path your OpenXBL plan exposes (the proxy is generic, so it's a
  one-line change).
- No auth is configured: there's no server-side data to protect (your library lives only in
  your browser). `robots.txt` + a `noindex` meta keep the site out of search results.
