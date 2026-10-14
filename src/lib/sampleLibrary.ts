import { db } from '../db/database';
import { nowIso, statusEvent } from '../db/repository';
import type { GameEntry } from '../types/game';

/** A sample record as shipped: bookkeeping is stamped when it's loaded. */
export type SampleGame = Omit<GameEntry, 'statusHistory' | 'createdAt' | 'updatedAt'>;

export async function loadSampleGames(): Promise<SampleGame[]> {
  const { default: text } = await import('../data/sample-library.json?raw');
  return JSON.parse(text) as SampleGame[];
}

/** Add the sample library to this browser's records. Returns how many were added. */
export async function loadSampleLibrary(): Promise<number> {
  const games = await loadSampleGames();
  const now = nowIso();
  await db.games.bulkPut(
    games.map((g) => ({
      ...g,
      statusHistory: [statusEvent(g.status, now)],
      createdAt: now,
      updatedAt: now,
    })),
  );
  return games.length;
}
