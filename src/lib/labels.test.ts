import { describe, it, expect, beforeEach } from 'vitest';
import { db, DEFAULT_SETTINGS, getSettings, saveSettings } from '../db/database';
import { createGame, type GameDraft } from '../db/repository';
import { DEFAULT_DISLIKES } from '../data/vocab';
import type { AppSettings } from '../types/game';
import {
  addLabel,
  deleteLabel,
  registerNewLabels,
  renameLabel,
  resolveDislikeLabels,
  resolveLikeLabels,
} from './labels';

const baseDraft: GameDraft = {
  title: 'Test',
  platforms: ['PC'],
  genres: ['RPG'],
  status: 'not_started',
  likes: [],
  dislikes: [],
  favorite: false,
};

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

beforeEach(async () => {
  await db.games.clear();
  await db.settings.clear();
});

describe('resolve labels', () => {
  it('falls back to defaults + custom when not materialized', () => {
    const s = settings({ customLikes: ['Speedrunning'] });
    const likes = resolveLikeLabels(s);
    expect(likes).toContain('Music'); // a built-in default
    expect(likes).toContain('Speedrunning');
    expect(resolveDislikeLabels(s)).toEqual(expect.arrayContaining(DEFAULT_DISLIKES));
  });

  it('uses the materialized list verbatim when set (defaults no longer apply)', () => {
    const s = settings({ likeLabels: ['Only This'] });
    expect(resolveLikeLabels(s)).toEqual(['Only This']);
    expect(resolveLikeLabels(s)).not.toContain('Music');
  });
});

describe('registerNewLabels', () => {
  it('adds brand-new form labels to the legacy custom list before materialization', async () => {
    await registerNewLabels(settings(), ['Vibes'], []);
    const s = await getSettings();
    expect(s.customLikes).toContain('Vibes');
    expect(s.likeLabels).toBeUndefined();
  });

  it('appends to the materialized list once it exists', async () => {
    await saveSettings({ likeLabels: ['Music'] });
    await registerNewLabels(await getSettings(), ['Vibes'], []);
    expect((await getSettings()).likeLabels).toEqual(['Music', 'Vibes']);
  });

  it('ignores labels that are already known', async () => {
    await registerNewLabels(settings(), ['Music'], []); // a default — no write
    expect((await getSettings()).customLikes).not.toContain('Music');
  });
});

describe('renameLabel', () => {
  it('cascades across every record and materializes the list', async () => {
    const a = await createGame({ ...baseDraft, likes: ['Music', 'Story'] });
    const b = await createGame({ ...baseDraft, title: 'B', likes: ['Music'] });
    const current = resolveLikeLabels(await getSettings());

    const n = await renameLabel('like', 'Music', 'Soundtrack', current);

    expect(n).toBe(2);
    expect((await db.games.get(a.id))!.likes).toEqual(['Soundtrack', 'Story']);
    expect((await db.games.get(b.id))!.likes).toEqual(['Soundtrack']);
    const s = await getSettings();
    expect(s.likeLabels).toContain('Soundtrack');
    expect(s.likeLabels).not.toContain('Music');
  });

  it('merges (dedupes) when renamed onto a label a record already has', async () => {
    const a = await createGame({ ...baseDraft, likes: ['Music', 'Soundtrack'] });
    await renameLabel('like', 'Music', 'Soundtrack', ['Music', 'Soundtrack']);
    expect((await db.games.get(a.id))!.likes).toEqual(['Soundtrack']);
  });
});

describe('deleteLabel', () => {
  it('strips the label from every record and from the list', async () => {
    const a = await createGame({ ...baseDraft, dislikes: ['Bugs', 'Grinding'] });
    const current = resolveDislikeLabels(await getSettings());

    const n = await deleteLabel('dislike', 'Bugs', current);

    expect(n).toBe(1);
    expect((await db.games.get(a.id))!.dislikes).toEqual(['Grinding']);
    expect((await getSettings()).dislikeLabels).not.toContain('Bugs');
  });
});

describe('addLabel', () => {
  it('adds a new label to the materialized list', async () => {
    const current = resolveLikeLabels(await getSettings());
    expect(await addLabel('like', 'Co-op', current)).toBe(true);
    expect((await getSettings()).likeLabels).toContain('Co-op');
  });

  it('refuses a blank or already-existing label', async () => {
    expect(await addLabel('like', '  ', ['Music'])).toBe(false);
    expect(await addLabel('like', 'Music', ['Music'])).toBe(false);
  });
});
