import seedData from '../data/seed.json';
import {
  clearAllGames,
  countGames,
  createGame,
  updateGame,
  type GameDraft,
} from './repository';

interface SeedEntry {
  title: string;
  publisher?: string;
  releaseDate?: string;
  platforms?: string[];
  publicScore?: number;
  genres?: string[];
  series?: string;
  wikiUrl?: string;
  // Collection wiring (resolved after all entries are created).
  isCollection?: boolean;
  excludeFromStats?: boolean;
  key?: string; // stable key a collection exposes
  memberOf?: string; // key of the collection this entry belongs to
}

function toDraft(s: SeedEntry): GameDraft {
  return {
    title: s.title,
    publisher: s.publisher,
    releaseDate: s.releaseDate,
    platforms: s.platforms ?? [],
    publicScore: s.publicScore,
    wikiUrl: s.wikiUrl,
    genres: s.genres ?? [],
    series: s.series,
    isCollection: s.isCollection,
    excludeFromStats: s.excludeFromStats,
    // Personal fields start empty so the user curates their own history.
    status: 'not_started',
    likes: [],
    dislikes: [],
    favorite: false,
  };
}

/** Create every seed entry, then resolve collection memberships by key. */
async function seedAll(): Promise<void> {
  const keyToId = new Map<string, string>();
  const members: Array<{ id: string; memberOf: string }> = [];

  for (const entry of seedData as SeedEntry[]) {
    const created = await createGame(toDraft(entry));
    if (entry.key) keyToId.set(entry.key, created.id);
    if (entry.memberOf) members.push({ id: created.id, memberOf: entry.memberOf });
  }

  for (const m of members) {
    const parentId = keyToId.get(m.memberOf);
    if (parentId) await updateGame(m.id, { collectionId: parentId });
  }
}

/** Seed the starter library on first run only (when the DB is empty). */
export async function ensureSeeded(): Promise<boolean> {
  if ((await countGames()) > 0) return false;
  await seedAll();
  return true;
}

/** Wipe everything and re-seed (used by the Settings reset action). */
export async function resetToSeed(): Promise<void> {
  await clearAllGames();
  await seedAll();
}
