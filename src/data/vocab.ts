import type { Bucket, PlayStatus } from '../types/game';

export interface StatusMeta {
  value: PlayStatus;
  label: string;
  bucket: Bucket;
  description: string;
  /** Mantine color name used for tags/badges. */
  color: string;
}

export interface BucketMeta {
  value: Bucket;
  label: string;
  color: string;
}

export const BUCKETS: BucketMeta[] = [
  { value: 'open', label: 'Open', color: 'blue' },
  { value: 'current', label: 'Current', color: 'teal' },
  { value: 'closed', label: 'Closed', color: 'grape' },
];

export const STATUSES: StatusMeta[] = [
  // Open
  {
    value: 'not_started',
    label: 'Not Started',
    bucket: 'open',
    color: 'gray',
    description: 'Purchased and planned to start soon, but not begun yet.',
  },
  {
    value: 'backlog',
    label: 'Backlog',
    bucket: 'open',
    color: 'indigo',
    description: 'Owned, but no plans to start yet.',
  },
  {
    value: 'wishlist',
    label: 'Wishlist',
    bucket: 'open',
    color: 'cyan',
    description: 'Want to buy — waiting on a sale or release date.',
  },
  // Current
  {
    value: 'active',
    label: 'Active',
    bucket: 'current',
    color: 'teal',
    description: 'Playing regularly during scheduled sessions.',
  },
  {
    value: 'passive',
    label: 'Passive',
    bucket: 'current',
    color: 'green',
    description: 'Playing occasionally between other games (no schedule).',
  },
  {
    value: 'paused',
    label: 'Paused',
    bucket: 'current',
    color: 'yellow',
    description: 'Started and plan to continue, but delayed for a reason.',
  },
  // Closed
  {
    value: 'completed',
    label: 'Completed',
    bucket: 'closed',
    color: 'grape',
    description: 'Finished the game and most content — full closure.',
  },
  {
    value: 'done_with',
    label: 'Done With',
    bucket: 'closed',
    color: 'violet',
    description: 'Finished enough to feel satisfied moving on.',
  },
  {
    value: 'abandoned',
    label: 'Abandoned',
    bucket: 'closed',
    color: 'red',
    description: 'Did not finish and felt no compulsion to.',
  },
];

export const STATUS_BY_VALUE: Record<PlayStatus, StatusMeta> = STATUSES.reduce(
  (acc, s) => {
    acc[s.value] = s;
    return acc;
  },
  {} as Record<PlayStatus, StatusMeta>,
);

export const BUCKET_BY_VALUE: Record<Bucket, BucketMeta> = BUCKETS.reduce(
  (acc, b) => {
    acc[b.value] = b;
    return acc;
  },
  {} as Record<Bucket, BucketMeta>,
);

export function bucketOf(status: PlayStatus): Bucket {
  return STATUS_BY_VALUE[status].bucket;
}

export function statusLabel(status: PlayStatus): string {
  return STATUS_BY_VALUE[status]?.label ?? status;
}

/** Statuses grouped by bucket, for grouped selects. */
export const STATUS_GROUPS = BUCKETS.map((b) => ({
  group: b.label,
  items: STATUSES.filter((s) => s.bucket === b.value).map((s) => ({
    value: s.value,
    label: s.label,
  })),
}));

export const DEFAULT_LIKES = [
  'Music',
  'Art Style',
  'Gameplay',
  'Exploration',
  'Story',
  'Characters',
  'World Building',
  'Combat',
  'Replayability',
  'Atmosphere',
  'Level Design',
  'Progression',
  'Multiplayer',
  'Difficulty',
];

export const DEFAULT_DISLIKES = [
  'Art Style',
  'Difficulty',
  'Repetitiveness',
  'Linear Story',
  'Bugs',
  'Length',
  'Pacing',
  'Controls',
  'Grinding',
  'Microtransactions',
  'Backtracking',
  'Camera',
];

/** Common platforms — free entry is still allowed in the form. */
export const COMMON_PLATFORMS = [
  'PC',
  'NES',
  'SNES',
  'N64',
  'GameCube',
  'Wii',
  'Wii U',
  'Switch',
  'Switch 2',
  'Game Boy',
  'Game Boy Advance',
  'Nintendo DS',
  'Nintendo 3DS',
  'Genesis',
  'Dreamcast',
  'PlayStation',
  'PlayStation 2',
  'PlayStation 3',
  'PlayStation 4',
  'PlayStation 5',
  'Xbox',
  'Xbox 360',
  'Xbox One',
  'Xbox Series X/S',
];

/** Common genres — free entry is still allowed in the form. */
export const COMMON_GENRES = [
  'Action',
  'Adventure',
  'RPG',
  'Platformer',
  'Metroidvania',
  'Shooter',
  'Fighting',
  'Puzzle',
  'Strategy',
  'Simulation',
  'Roguelike',
  'Card Game',
  'MMORPG',
  'Racing',
  'Sports',
  'Survival',
  'Sandbox',
  'Indie',
];

export const BACKUP_VERSION = 1;
