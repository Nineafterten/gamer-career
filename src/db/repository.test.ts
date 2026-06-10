import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './database';
import {
  applyBulkEdit,
  createGame,
  deleteGame,
  deleteGames,
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

describe('applyBulkEdit / deleteGames', () => {
  it('merges tag fields across the selected records', async () => {
    const a = await createGame({ ...draft, platforms: ['PC'] });
    const b = await createGame({ ...draft, title: 'B', platforms: ['Switch'] });
    const n = await applyBulkEdit([a.id, b.id], {
      platforms: { mode: 'add', values: ['PS5'] },
    });
    expect(n).toBe(2);
    expect((await getGame(a.id))!.platforms).toEqual(['PC', 'PS5']);
    expect((await getGame(b.id))!.platforms).toEqual(['Switch', 'PS5']);
  });

  it('appends a StatusEvent only on a real status change', async () => {
    const a = await createGame({ ...draft, status: 'backlog' });
    await applyBulkEdit([a.id], { status: 'completed' });
    const after = await getGame(a.id);
    expect(after!.status).toBe('completed');
    expect(after!.statusHistory).toHaveLength(2);
    expect(after!.statusHistory[1]).toMatchObject({
      status: 'completed',
      bucket: 'closed',
    });
    // Re-applying the same status is a no-op for history.
    await applyBulkEdit([a.id], { status: 'completed' });
    expect((await getGame(a.id))!.statusHistory).toHaveLength(2);
  });

  it('deleteGames removes the whole set', async () => {
    const a = await createGame(draft);
    const b = await createGame({ ...draft, title: 'B' });
    await deleteGames([a.id, b.id]);
    expect(await getAllGames()).toHaveLength(0);
  });
});
