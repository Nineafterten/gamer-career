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
  /**
   * The title as first imported/created, preserved even if `title` is later
   * rewritten by metadata enrichment. Used for stable duplicate detection so a
   * re-sync still matches a record whose display title has since changed.
   */
  sourceTitle?: string;

  // --- Personal information (provided by the user) ---
  status: PlayStatus;
  personalScore?: number; // 0-100 internally (entered 1-10, x10)
  likes: string[];
  dislikes: string[];
  noteworthy?: string;
  favorite: boolean;
  favoriteRank?: number; // ordering within the Favorites view
  /**
   * Hidden from every list and excluded from every stat (e.g. junk imports, or a
   * game someone else logged under your Xbox profile). Kept in the DB on purpose so
   * `flagDuplicates` still recognizes it on a re-sync and skips re-adding it.
   */
  hidden?: boolean;

  // --- Collections (compilations) ---
  /** True when this entry represents a collection of other entries. */
  isCollection?: boolean;
  /** Id of the collection entry this game is a member of (member → parent). */
  collectionId?: string;
  /** Omit from KPI counts/averages (e.g. members already covered by a collection). */
  excludeFromStats?: boolean;

  // --- Variants (alternate editions of the SAME game) ---
  /**
   * Id of the canonical/original record this entry is a variant of — a remaster,
   * port, HD re-release, or platform edition of the same game (e.g. a Bedrock
   * record pointing at the original Minecraft). Distinct from collections, which
   * bundle *different* games; the two can co-exist on one record. A variant is
   * still real time spent, but the game's uniqueness belongs to the canonical.
   */
  variantOfId?: string;

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
