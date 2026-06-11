// Thin client for the RAWG video game database API (https://rawg.io/apidocs).
// Called directly from the browser with the user's free API key.

import { wikipediaSearchUrl } from './wikipedia';

const BASE = 'https://api.rawg.io/api';

export interface RawgSearchResult {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  metacritic: number | null;
  rating: number | null; // 0-5
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
}

export interface RawgDetail extends RawgSearchResult {
  publishers?: { name: string }[];
  website?: string;
  description_raw?: string;
}

/** Public fields we can autofill onto a GameEntry. */
export interface PublicFieldsPatch {
  title: string;
  publisher?: string;
  releaseDate?: string;
  platforms: string[];
  publicScore?: number;
  genres: string[];
  coverImageUrl?: string;
  wikiUrl?: string;
  rawgId: number;
}

export class RawgError extends Error {}

function ensureKey(key: string | undefined): asserts key is string {
  if (!key || !key.trim()) {
    throw new RawgError(
      'No RAWG API key set. Add a free key in Settings to fetch game details.',
    );
  }
}

async function request<T>(path: string, key: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${BASE}${path}${sep}key=${encodeURIComponent(key)}`);
  if (res.status === 401) {
    throw new RawgError('RAWG rejected the API key. Double-check it in Settings.');
  }
  if (!res.ok) {
    throw new RawgError(`RAWG request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

export async function searchGames(
  query: string,
  key: string | undefined,
): Promise<RawgSearchResult[]> {
  ensureKey(key);
  const trimmed = query.trim();
  if (!trimmed) return [];
  // Fuzzy search (no search_precise) returns more candidates, and a larger
  // page so older/obscure titles aren't cut off; the UI list scrolls.
  const data = await request<{ results: RawgSearchResult[] }>(
    `/games?search=${encodeURIComponent(trimmed)}&page_size=20`,
    key,
  );
  return data.results ?? [];
}

export async function getGameDetail(
  id: number,
  key: string | undefined,
): Promise<RawgDetail> {
  ensureKey(key);
  return request<RawgDetail>(`/games/${id}`, key);
}

/** Light normalization of RAWG platform names toward our common list. */
const PLATFORM_ALIASES: Record<string, string> = {
  'Nintendo Switch': 'Switch',
  'Nintendo Switch 2': 'Switch 2',
  PC: 'PC',
  'PlayStation 5': 'PlayStation 5',
  'PlayStation 4': 'PlayStation 4',
  'Xbox Series S/X': 'Xbox Series X/S',
  'Game Boy Advance': 'Game Boy Advance',
  'Nintendo GameCube': 'GameCube',
  'SNES': 'SNES',
  'Genesis': 'Genesis',
  'Game Boy': 'Game Boy',
};

function normalizePlatform(name: string): string {
  return PLATFORM_ALIASES[name] ?? name;
}

// Only trust RAWG's Metacritic critic score. The community `rating` is sparse and
// skews low for older/obscure games (e.g. it would rate Mega Man X a "55"), so we
// leave the public score blank when there's no Metacritic value for the user to set.
function scoreFrom(detail: RawgSearchResult): number | undefined {
  return typeof detail.metacritic === 'number' ? detail.metacritic : undefined;
}

export function toPublicFields(detail: RawgDetail): PublicFieldsPatch {
  return {
    title: detail.name,
    publisher: detail.publishers?.map((p) => p.name).join(', ') || undefined,
    releaseDate: detail.released ?? undefined,
    platforms: (detail.platforms ?? []).map((p) =>
      normalizePlatform(p.platform.name),
    ),
    publicScore: scoreFrom(detail),
    genres: (detail.genres ?? []).map((g) => g.name),
    coverImageUrl: detail.background_image ?? undefined,
    // Default to a Wikipedia link (the apply flow upgrades this to the resolved
    // article via resolveWikipediaUrl). RAWG's `website` is usually a store page.
    wikiUrl: wikipediaSearchUrl(detail.name),
    rawgId: detail.id,
  };
}
