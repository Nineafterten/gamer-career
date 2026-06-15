import { bucketOf } from '../data/vocab';
import { needsReview } from '../data/presets';
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

export interface Kpis {
  total: number;
  unique: number; // distinct games (variant editions collapsed onto their canonical)
  notStarted: number;
  backlog: number;
  inPlay: number; // active + passive
  paused: number;
  wishlist: number;
  completed: number;
  doneWith: number;
  abandoned: number;
  closedPositive: number; // completed + doneWith
  needsReview: number; // records missing a score, cover art, or an abandon reason
  favorites: number;
  repeats: number; // variant/edition records linked to a canonical original
  avgPersonal?: number; // 0-100
  avgPublic?: number; // 0-100
  completionRate: number; // 0-1, closedPositive / total
}

export function computeKpis(allGames: GameEntry[]): Kpis {
  // Hidden records and entries explicitly excluded (e.g. games covered by a
  // collection) don't count toward totals/averages.
  const games = allGames.filter((g) => !g.excludeFromStats && !g.hidden);
  const byStatus = (s: PlayStatus) => games.filter((g) => g.status === s).length;

  const completed = byStatus('completed');
  const doneWith = byStatus('done_with');
  const closedPositive = completed + doneWith;
  const total = games.length;
  // Each variant edition is real time spent (counted in `total`), but it's not a
  // distinct game — so `unique` collapses variants onto their canonical original.
  const variants = games.filter((g) => g.variantOfId).length;

  return {
    total,
    unique: total - variants,
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
    repeats: variants,
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
