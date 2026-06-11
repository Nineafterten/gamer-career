// Client for IGDB-sourced public scores — talks to our own Netlify proxy
// (/api/igdb), never to api.igdb.com directly. See netlify/functions/igdb.mjs.
//
// IGDB's `rating` is its community (gamer) score — the trustworthy, gamer-
// maintained number we want, from a source with a real API (GameFAQs has none
// and blocks scrapers). We fall back to the critic `aggregated_rating`, and to
// nothing at all when the proxy isn't reachable (e.g. the plain dev server), so
// the caller keeps whatever score it already had.

import { canonTitle } from './bulkImport';

const PROXY = '/api/igdb';

export interface IgdbGame {
  id: number;
  name: string;
  rating?: number; // community/member score, 0-100
  rating_count?: number;
  aggregated_rating?: number; // critic aggregate, 0-100
  aggregated_rating_count?: number;
}

async function searchIgdb(title: string): Promise<IgdbGame[]> {
  const q = title.trim();
  if (!q) return [];
  let res: Response;
  try {
    res = await fetch(`${PROXY}?q=${encodeURIComponent(q)}`);
  } catch {
    return []; // proxy unreachable — no score, keep existing value
  }
  if (!res.ok) return []; // 503 not configured / upstream error
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? (data as IgdbGame[]) : [];
  } catch {
    return []; // plain dev server falls /api/igdb through to index.html (HTML)
  }
}

/**
 * Best gamer-sourced public score (0-100, rounded) for a title from IGDB, or
 * `undefined` when IGDB has no rating or isn't reachable. Prefers the community
 * `rating`; falls back to the critic `aggregated_rating`.
 */
export async function getPublicScore(title: string): Promise<number | undefined> {
  const results = await searchIgdb(title);
  if (!results.length) return undefined;
  const key = canonTitle(title);
  const match =
    results.find((g) => canonTitle(g.name ?? '') === key) ?? results[0];
  const score = match.rating ?? match.aggregated_rating;
  return typeof score === 'number' ? Math.round(score) : undefined;
}
