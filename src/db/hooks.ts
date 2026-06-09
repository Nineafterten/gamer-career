import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './database';
import type { AppSettings, GameEntry } from '../types/game';

/** All games, reactively. `undefined` while the first read is in flight. */
export function useGames(): GameEntry[] | undefined {
  return useLiveQuery(() => db.games.toArray(), []);
}

/** A single game by id (ignores the sentinel 'new'). */
export function useGame(id?: string | null): GameEntry | undefined {
  return useLiveQuery(async () => {
    if (!id || id === 'new') return undefined;
    return db.games.get(id);
  }, [id]);
}

/**
 * App settings row, reactively. Read-only — the row is created once at
 * bootstrap, so the live query never writes (writing inside a liveQuery throws).
 */
export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => db.settings.get('app'), []);
}
