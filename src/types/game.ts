// Core domain types for the Gamer Career dashboard.

/** The three top-level View buckets a game can sit in. */
export type Bucket = 'open' | 'current' | 'closed';

/** Granular play sub-status. Stored on the record; bucket is derived. */
export type PlayStatus =
  // Open
  | 'not_started'
  | 'backlog'
  | 'wishlist'
  // Current
  | 'active'
  | 'passive'
  | 'paused'
  // Closed
  | 'completed'
  | 'done_with'
  | 'abandoned';

/** A single status transition, appended whenever `status` changes. */
export interface StatusEvent {
  status: PlayStatus;
  bucket: Bucket;
  at: string; // ISO timestamp
}

/** A game entry record — the central object of the app. */
export interface GameEntry {
  id: string; // uuid

  // --- Public information (autofillable via RAWG) ---
  title: string;
  publisher?: string;
  releaseDate?: string; // ISO (YYYY-MM-DD)
  platforms: string[]; // console / format(s)
  publicScore?: number; // normalized 0-100
  wikiUrl?: string; // reference link to a public wiki
  genres: string[];
  series?: string;
  coverImageUrl?: string;
  rawgId?: number;

  // --- Personal information (provided by the user) ---
  status: PlayStatus;
  startDate?: string; // ISO date (YYYY-MM-DD) — when it first entered a Current state
  endDate?: string; // ISO date — when it entered a Closed state
  personalScore?: number; // 0-100 internally (entered 1-10, x10)
  likes: string[];
  dislikes: string[];
  noteworthy?: string;
  favorite: boolean;
  favoriteRank?: number; // ordering within the Favorites view

  // --- Collections (compilations / remasters) ---
  /** True when this entry represents a collection of other entries. */
  isCollection?: boolean;
  /** Id of the collection entry this game is a member of (member → parent). */
  collectionId?: string;
  /** Omit from KPI counts/averages (e.g. members already covered by a collection). */
  excludeFromStats?: boolean;

  // --- Bookkeeping ---
  statusHistory: StatusEvent[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** Shape of the persisted app settings row. */
export interface AppSettings {
  id: 'app'; // single-row table
  rawgApiKey?: string;
  colorScheme: 'light' | 'dark' | 'auto';
  customLikes: string[];
  customDislikes: string[];
}

/** Versioned backup envelope produced by the export tool. */
export interface BackupFile {
  app: 'gamer-career';
  version: number;
  exportedAt: string;
  games: GameEntry[];
  settings: Partial<AppSettings>;
}
