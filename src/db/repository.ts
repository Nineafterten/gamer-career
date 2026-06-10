import { db } from './database';
import { bucketOf } from '../data/vocab';
import { computeBulkPatch, type BulkEditSpec } from '../lib/bulkEdit';
import type { GameEntry, PlayStatus, StatusEvent } from '../types/game';

export function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for very old environments.
  return 'g_' + Math.abs(Date.now() ^ (Math.random() * 1e9)).toString(36);
}

/** Fields a caller supplies when creating/editing; bookkeeping is managed here. */
export type GameDraft = Omit<
  GameEntry,
  'id' | 'statusHistory' | 'createdAt' | 'updatedAt'
> & {
  /** Optional explicit timestamp for the initial status (used by seeding). */
  statusAt?: string;
};

function statusEvent(status: PlayStatus, at: string): StatusEvent {
  return { status, bucket: bucketOf(status), at };
}

export async function getAllGames(): Promise<GameEntry[]> {
  return db.games.toArray();
}

export async function getGame(id: string): Promise<GameEntry | undefined> {
  return db.games.get(id);
}

export async function createGame(draft: GameDraft): Promise<GameEntry> {
  const now = nowIso();
  const { statusAt, ...rest } = draft;
  const entry: GameEntry = {
    ...rest,
    id: newId(),
    statusHistory: [statusEvent(draft.status, statusAt ?? now)],
    createdAt: now,
    updatedAt: now,
  };
  // Snapshot the original title for stable duplicate detection (survives later
  // metadata title rewrites).
  if (!entry.sourceTitle) entry.sourceTitle = entry.title;

  await db.games.put(entry);
  return entry;
}

/**
 * Patch an existing record. If `status` changes, a StatusEvent is appended so
 * the played-this-year count and status timeline can be derived.
 */
export async function updateGame(
  id: string,
  patch: Partial<GameDraft>,
): Promise<GameEntry> {
  const current = await db.games.get(id);
  if (!current) throw new Error(`Game ${id} not found`);

  const now = nowIso();
  const statusChanged =
    patch.status !== undefined && patch.status !== current.status;

  const next: GameEntry = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    statusHistory: statusChanged
      ? [...current.statusHistory, statusEvent(patch.status!, now)]
      : current.statusHistory,
    updatedAt: now,
  };

  await db.games.put(next);
  return next;
}

export async function deleteGame(id: string): Promise<void> {
  await db.games.delete(id);
}

/**
 * Apply one {@link BulkEditSpec} to many records in a single transaction. A
 * changed `status` appends a StatusEvent just like {@link updateGame}. Returns
 * the number of records written.
 */
export async function applyBulkEdit(
  ids: string[],
  spec: BulkEditSpec,
): Promise<number> {
  if (!ids.length) return 0;
  const now = nowIso();
  let changed = 0;
  await db.transaction('rw', db.games, async () => {
    const current = await db.games.bulkGet(ids);
    const updates: GameEntry[] = [];
    for (const game of current) {
      if (!game) continue;
      const patch = computeBulkPatch(game, spec);
      if (!Object.keys(patch).length) continue;
      const statusChanged =
        patch.status !== undefined && patch.status !== game.status;
      updates.push({
        ...game,
        ...patch,
        statusHistory: statusChanged
          ? [...game.statusHistory, statusEvent(patch.status!, now)]
          : game.statusHistory,
        updatedAt: now,
      });
    }
    if (updates.length) await db.games.bulkPut(updates);
    changed = updates.length;
  });
  return changed;
}

/** Delete a set of records at once (used by the bulk selection bar). */
export async function deleteGames(ids: string[]): Promise<void> {
  if (ids.length) await db.games.bulkDelete(ids);
}

/** Replace the entire library (used by import / reset). */
export async function replaceAllGames(games: GameEntry[]): Promise<void> {
  await db.transaction('rw', db.games, async () => {
    await db.games.clear();
    if (games.length) await db.games.bulkPut(games);
  });
}

/** Merge games by id (used by import "merge" mode). */
export async function mergeGames(games: GameEntry[]): Promise<void> {
  if (games.length) await db.games.bulkPut(games);
}

export async function clearAllGames(): Promise<void> {
  await db.games.clear();
}
