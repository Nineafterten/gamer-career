import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/database';
import { getAllGames } from '../db/repository';
import { STATUSES } from '../data/vocab';
import { loadSampleGames, loadSampleLibrary } from './sampleLibrary';

const ALLOWED = new Set([
  'id', 'title', 'publisher', 'releaseDate', 'platforms', 'publicScore', 'wikiUrl', 'genres',
  'series', 'coverImageUrl', 'rawgId', 'status', 'personalScore', 'likes', 'dislikes',
  'noteworthy', 'favorite', 'favoriteRank', 'isCollection', 'collectionId',
  'excludeFromStats', 'variantOfId',
]);

beforeEach(async () => {
  await db.games.clear();
});

describe('sample library', () => {
  it('ships only allowlisted fields and no hidden records', async () => {
    const games = await loadSampleGames();
    expect(games.length).toBeGreaterThan(0);
    const extra = games.flatMap((g) => Object.keys(g).filter((k) => !ALLOWED.has(k)));
    expect(extra).toEqual([]);
  });

  it('has valid statuses, unique ids and resolvable variant/collection links', async () => {
    const games = await loadSampleGames();
    const statuses = new Set(STATUSES.map((s) => s.value));
    const ids = new Set(games.map((g) => g.id));
    expect(ids.size).toBe(games.length);
    expect(games.filter((g) => !statuses.has(g.status))).toEqual([]);
    const dangling = games.filter(
      (g) =>
        (g.variantOfId && !ids.has(g.variantOfId)) ||
        (g.collectionId && !ids.has(g.collectionId)),
    );
    expect(dangling).toEqual([]);
  });

  it('stores every sample game with a fresh single-event status history', async () => {
    const added = await loadSampleLibrary();
    const games = await getAllGames();
    expect(games).toHaveLength(added);
    expect(games.every((g) => g.statusHistory.length === 1)).toBe(true);
    expect(games.every((g) => g.statusHistory[0].status === g.status)).toBe(true);
  });
});
