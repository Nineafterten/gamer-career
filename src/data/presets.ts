import type { GameEntry } from '../types/game';

/** Which hero visualization a view renders. */
export type ChartKind =
  | 'timeline'
  | 'backlog'
  | 'inplay'
  | 'rating'
  | 'abandoned'
  | 'genre'
  | 'wishlist'
  | 'review';

/** A positively-closed game (completed/done with) with no personal score yet. */
export function needsScore(g: GameEntry): boolean {
  return (
    (g.status === 'completed' || g.status === 'done_with') &&
    typeof g.personalScore !== 'number'
  );
}

/** Any record still missing cover art — a proxy for "not yet enriched / fetched". */
export function needsArt(g: GameEntry): boolean {
  return !g.coverImageUrl;
}

/** An abandoned game with no dislike tag recording why it was dropped. */
export function needsAbandonReason(g: GameEntry): boolean {
  return g.status === 'abandoned' && g.dislikes.length === 0;
}

/** A record that needs attention for any data-hygiene reason. */
export function needsReview(g: GameEntry): boolean {
  return needsScore(g) || needsArt(g) || needsAbandonReason(g);
}

export interface PresetConfig {
  key: string;
  label: string;
  description: string;
  chart: ChartKind;
  /** Membership test for the preset. */
  match: (g: GameEntry) => boolean;
}

export const PRESETS: Record<string, PresetConfig> = {
  all: {
    key: 'all',
    label: 'All Games',
    description: 'Your complete library, plotted in release order.',
    chart: 'timeline',
    match: () => true,
  },
  not_started: {
    key: 'not_started',
    label: 'Not Started',
    description: 'Bought and ready to go — just not begun yet.',
    chart: 'timeline',
    match: (g) => g.status === 'not_started',
  },
  backlog: {
    key: 'backlog',
    label: 'Backlog',
    description: 'Owned, waiting their turn — broken down by platform or genre.',
    chart: 'backlog',
    match: (g) => g.status === 'backlog',
  },
  in_play: {
    key: 'in_play',
    label: 'In Play',
    description: 'Active and passive games — broken down by platform or genre.',
    chart: 'inplay',
    match: (g) => g.status === 'active' || g.status === 'passive',
  },
  paused: {
    key: 'paused',
    label: 'Paused',
    description: 'Started, but on hold for now — broken down by platform or genre.',
    chart: 'inplay',
    match: (g) => g.status === 'paused',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    description: 'Fully finished — your score vs. the public score.',
    chart: 'rating',
    match: (g) => g.status === 'completed',
  },
  done_with: {
    key: 'done_with',
    label: 'Done With',
    description: 'Finished enough to move on — your score vs. the public score.',
    chart: 'rating',
    match: (g) => g.status === 'done_with',
  },
  needs_review: {
    key: 'needs_review',
    label: 'Needs Review',
    description: 'Records to tidy up — missing a score, cover art, or an abandon reason.',
    chart: 'review',
    match: needsReview,
  },
  abandoned: {
    key: 'abandoned',
    label: 'Abandoned',
    description: 'What made you walk away — your most common dislikes.',
    chart: 'abandoned',
    match: (g) => g.status === 'abandoned',
  },
  favorites: {
    key: 'favorites',
    label: 'Favorites',
    description: 'Your standouts, clustered by genre and series.',
    chart: 'genre',
    match: (g) => g.favorite,
  },
  wishlist: {
    key: 'wishlist',
    label: 'Wishlist',
    description: 'Want to buy — broken down by platform or genre.',
    chart: 'wishlist',
    match: (g) => g.status === 'wishlist',
  },
  hidden: {
    key: 'hidden',
    label: 'Hidden',
    description: "Records you've hidden — excluded from every other list and stat.",
    chart: 'timeline',
    match: (g) => !!g.hidden,
  },
};

export function getPreset(key?: string | null): PresetConfig {
  return (key && PRESETS[key]) || PRESETS.all;
}
