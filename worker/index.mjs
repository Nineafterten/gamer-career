// Cloudflare Worker entry: the two API proxies run here, and every other path is
// the static build in dist/ (wrangler.jsonc sends only /api/* to this script first).
import { handleIgdb } from './igdb.mjs';
import { handleXbox } from './xbox.mjs';

const ROUTES = {
  '/api/xbox': handleXbox,
  '/api/igdb': handleIgdb,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = ROUTES[url.pathname];
    if (route) return route(url, env);
    return env.ASSETS.fetch(request);
  },
};
