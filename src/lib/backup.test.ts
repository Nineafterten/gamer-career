import { describe, it, expect, beforeEach } from 'vitest';
import { db, saveSettings } from '../db/database';
import { createGame, getAllGames, replaceAllGames } from '../db/repository';
import { buildBackup, importFromFile } from './backup';

const draft = {
  title: 'Backup Game',
  platforms: ['PC'],
  genres: ['RPG'],
  status: 'completed' as const,
  likes: [],
  dislikes: [],
  favorite: false,
};

beforeEach(async () => {
  await db.games.clear();
  await db.settings.clear();
});

describe('buildBackup', () => {
  it('captures games + settings but never the RAWG key', async () => {
    await createGame(draft);
    await saveSettings({ rawgApiKey: 'super-secret', customLikes: ['Soundtrack'] });

    const backup = await buildBackup();
    expect(backup.app).toBe('gamer-career');
    expect(backup.games).toHaveLength(1);
    expect(backup.settings.rawgApiKey).toBeUndefined();
    expect(backup.settings.customLikes).toEqual(['Soundtrack']);
  });
});

describe('importFromFile', () => {
  async function backupFile(): Promise<File> {
    const backup = await buildBackup();
    return new File([JSON.stringify(backup)], 'backup.json', {
      type: 'application/json',
    });
  }

  it('round-trips an export back into the library', async () => {
    await createGame(draft);
    await createGame({ ...draft, title: 'Second' });
    const file = await backupFile();

    await replaceAllGames([]);
    expect(await getAllGames()).toHaveLength(0);

    const result = await importFromFile(file, 'replace');
    expect(result.games).toBe(2);
    expect(await getAllGames()).toHaveLength(2);
  });

  it('rejects invalid JSON', async () => {
    const bad = new File(['{not json'], 'bad.json', { type: 'application/json' });
    await expect(importFromFile(bad, 'replace')).rejects.toThrow(/valid JSON/i);
  });

  it('rejects a file without a games array', async () => {
    const notBackup = new File([JSON.stringify({ hello: 'world' })], 'x.json');
    await expect(importFromFile(notBackup, 'replace')).rejects.toThrow(
      /Gamer Career backup/i,
    );
  });
});
