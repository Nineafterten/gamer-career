import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database';
import {
  createGame,
  deleteGame,
  getAllGames,
  getGame,
  replaceAllGames,
  updateGame,
  type GameDraft,
} from './repository';

const draft: GameDraft = {
  title: 'Test Game',
  platforms: ['PC'],
  genres: ['RPG'],
  status: 'not_started',
  likes: [],
  dislikes: [],
  favorite: false,
};

beforeEach(async () => {
  await db.games.clear();
});

describe('createGame', () => {
  it('assigns an id and seeds statusHistory with the initial status', async () => {
    const game = await createGame(draft);
    expect(game.id).toBeTruthy();
    expect(game.createdAt).toBeTruthy();
    expect(game.statusHistory).toHaveLength(1);
    expect(game.statusHistory[0]).toMatchObject({
      status: 'not_started',
      bucket: 'open',
    });
    expect(await getGame(game.id)).toMatchObject({ title: 'Test Game' });
  });
});

describe('updateGame', () => {
  it('appends a StatusEvent only when the status changes', async () => {
    const game = await createGame(draft);

    const renamed = await updateGame(game.id, { title: 'Renamed' });
    expect(renamed.title).toBe('Renamed');
    expect(renamed.statusHistory).toHaveLength(1); // no status change

    const moved = await updateGame(game.id, { status: 'active' });
    expect(moved.statusHistory).toHaveLength(2);
    expect(moved.statusHistory[1]).toMatchObject({
      status: 'active',
      bucket: 'current',
    });
  });

  it('preserves createdAt and keeps updatedAt current', async () => {
    const game = await createGame(draft);
    const updated = await updateGame(game.id, { status: 'backlog' });
    expect(updated.createdAt).toBe(game.createdAt);
    // ISO strings sort chronologically; updatedAt is never before createdAt.
    expect(updated.updatedAt >= updated.createdAt).toBe(true);
  });
});

describe('play dates are manual (no auto-fill)', () => {
  it('does not set dates from the status bucket on create', async () => {
    const active = await createGame({ ...draft, status: 'active' });
    expect(active.startDate).toBeUndefined();
    const completed = await createGame({ ...draft, status: 'completed' });
    expect(completed.endDate).toBeUndefined();
  });

  it('does not set dates when a status change occurs', async () => {
    const g = await createGame(draft);
    const moved = await updateGame(g.id, { status: 'active' });
    expect(moved.startDate).toBeUndefined();
  });

  it('persists explicitly provided dates', async () => {
    const g = await createGame({ ...draft, startDate: '2020-01-01', endDate: '2020-02-01' });
    expect(g.startDate).toBe('2020-01-01');
    expect(g.endDate).toBe('2020-02-01');
  });
});

describe('deleteGame / replaceAllGames', () => {
  it('removes a single game', async () => {
    const game = await createGame(draft);
    await deleteGame(game.id);
    expect(await getGame(game.id)).toBeUndefined();
  });

  it('replaces the whole library', async () => {
    await createGame(draft);
    await createGame({ ...draft, title: 'Second' });
    const all = await getAllGames();
    await replaceAllGames([all[0]]);
    const after = await getAllGames();
    expect(after).toHaveLength(1);
  });
});
