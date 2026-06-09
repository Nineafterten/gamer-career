import { bucketOf } from '../data/vocab';
import { needsReview } from '../data/presets';
import { canonTitle } from './bulkImport';
import type { Bucket, GameEntry, PlayStatus } from '../types/game';

/** The earliest transition into any status within a bucket. */
export function firstEventIntoBucket(game: GameEntry, bucket: Bucket) {
  return game.statusHistory.find((e) => e.bucket === bucket);
}

/** ISO timestamp the game first moved into a Current play state. */
export function inPlaySince(game: GameEntry): string | undefined {
  if (bucketOf(game.status) !== 'current') return undefined;
  return firstEventIntoBucket(game, 'current')?.at;
}

export function closedAt(game: GameEntry): string | undefined {
  return firstEventIntoBucket(game, 'closed')?.at;
}

function avg(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Count distinct titles played both as a standalone entry and as a member of a
 * collection (e.g. a game beaten on its own and again via a later remaster).
 * The collection container itself isn't a played title, so it's skipped; member
 * copies are usually flagged `excludeFromStats`, so this runs over the unfiltered
 * library. Titles are normalized so "II" and "2" still match.
 */
export function repeatsCount(allGames: GameEntry[]): number {
  const standalone = new Set<string>();
  const members = new Set<string>();
  for (const g of allGames) {
    if (g.isCollection) continue;
    const key = canonTitle(g.title);
    if (g.collectionId) members.add(key);
    else standalone.add(key);
  }
  let count = 0;
  for (const key of standalone) if (members.has(key)) count += 1;
  return count;
}

export interface Kpis {
  total: number;
  notStarted: number;
  backlog: number;
  inPlay: number; // active + passive
  paused: number;
  wishlist: number;
  completed: number;
  doneWith: number;
  abandoned: number;
  closedPositive: number; // completed + doneWith
  needsReview: number; // positively-closed games missing a personal score
  favorites: number;
  repeats: number; // titles played standalone AND via a collection
  avgPersonal?: number; // 0-100
  avgPublic?: number; // 0-100
  completionRate: number; // 0-1, closedPositive / total
  playedThisYear: number;
}

export function computeKpis(allGames: GameEntry[]): Kpis {
  // Entries explicitly excluded (e.g. games covered by a collection) don't
  // count toward totals/averages so compilations aren't double-counted.
  const games = allGames.filter((g) => !g.excludeFromStats);
  const byStatus = (s: PlayStatus) => games.filter((g) => g.status === s).length;
  const thisYear = new Date().getFullYear();

  const completed = byStatus('completed');
  const doneWith = byStatus('done_with');
  const closedPositive = completed + doneWith;
  const total = games.length;

  const playedThisYear = games.filter((g) => {
    const since = inPlaySince(g) ?? closedAt(g);
    return since ? new Date(since).getFullYear() === thisYear : false;
  }).length;

  return {
    total,
    notStarted: byStatus('not_started'),
    backlog: byStatus('backlog'),
    inPlay: byStatus('active') + byStatus('passive'),
    paused: byStatus('paused'),
    wishlist: byStatus('wishlist'),
    completed,
    doneWith,
    abandoned: byStatus('abandoned'),
    closedPositive,
    needsReview: games.filter(needsReview).length,
    favorites: games.filter((g) => g.favorite).length,
    // Repeats span standalone + collection copies, so they read the full library.
    repeats: repeatsCount(allGames),
    avgPersonal: avg(
      games
        .map((g) => g.personalScore)
        .filter((v): v is number => typeof v === 'number'),
    ),
    avgPublic: avg(
      games
        .map((g) => g.publicScore)
        .filter((v): v is number => typeof v === 'number'),
    ),
    completionRate: total ? closedPositive / total : 0,
    playedThisYear,
  };
}

/** Convert internal 0-100 score to a display 0-10 with one decimal. */
export function toDisplayScore(score?: number): string {
  if (typeof score !== 'number') return '—';
  return (score / 10).toFixed(1);
}

export interface ScoreBin {
  label: string; // e.g. "8–9"
  mine: number;
  public: number;
}

/** Histogram of scores binned into ten 1-point buckets (0–1 … 9–10). */
export function scoreHistogram(games: GameEntry[]): ScoreBin[] {
  const bins: ScoreBin[] = Array.from({ length: 10 }, (_, i) => ({
    label: `${i}–${i + 1}`,
    mine: 0,
    public: 0,
  }));
  // 0-100 internal score → bin index 0..9 (100 lands in the top bucket).
  const idx = (score: number) => Math.min(9, Math.max(0, Math.floor(score / 10)));
  for (const g of games) {
    if (typeof g.personalScore === 'number') bins[idx(g.personalScore)].mine += 1;
    if (typeof g.publicScore === 'number') bins[idx(g.publicScore)].public += 1;
  }
  return bins;
}
