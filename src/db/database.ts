import Dexie, { type Table } from 'dexie';
import type { AppSettings, GameEntry } from '../types/game';

/**
 * IndexedDB schema (via Dexie). `games` holds the live records; `settings`
 * is a single-row table keyed by the constant id 'app'.
 */
export class GamerCareerDB extends Dexie {
  games!: Table<GameEntry, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('gamer-career');
    this.version(1).stores({
      // Indexed fields only; the full object is stored regardless.
      // NOTE: never index booleans (e.g. `favorite`) — IndexedDB rejects
      // boolean values as keys. `favorite` is filtered in memory instead.
      games: 'id, title, status, releaseDate, updatedAt',
      settings: 'id',
    });
  }
}

export const db = new GamerCareerDB();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  colorScheme: 'auto',
  customLikes: [],
  customDislikes: [],
};

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app');
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch, id: 'app' as const };
  await db.settings.put(next);
  return next;
}
