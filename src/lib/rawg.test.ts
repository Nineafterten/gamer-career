import { describe, it, expect } from 'vitest';
import { RawgError, searchGames, toPublicFields, type RawgDetail } from './rawg';

const base: RawgDetail = {
  id: 42,
  name: 'Hollow Knight',
  released: '2017-02-24',
  background_image: 'https://img/hk.jpg',
  metacritic: 90,
  rating: 4.5,
  genres: [{ name: 'Metroidvania' }],
  platforms: [{ platform: { name: 'Nintendo Switch' } }, { platform: { name: 'PC' } }],
  publishers: [{ name: 'Team Cherry' }],
  website: 'https://hollowknight.com',
};

describe('toPublicFields', () => {
  it('maps RAWG detail onto public game fields', () => {
    const p = toPublicFields(base);
    expect(p.title).toBe('Hollow Knight');
    expect(p.publisher).toBe('Team Cherry');
    expect(p.releaseDate).toBe('2017-02-24');
    expect(p.publicScore).toBe(90); // prefers metacritic
    expect(p.genres).toEqual(['Metroidvania']);
    expect(p.platforms).toContain('Switch'); // normalized from "Nintendo Switch"
    expect(p.rawgId).toBe(42);
  });

  it('falls back to rating*20 when metacritic is absent', () => {
    const p = toPublicFields({ ...base, metacritic: null, rating: 4 });
    expect(p.publicScore).toBe(80);
  });

  it('builds a Wikipedia search link when no website is given', () => {
    const p = toPublicFields({ ...base, website: undefined });
    expect(p.wikiUrl).toContain('en.wikipedia.org');
  });
});

describe('searchGames', () => {
  it('throws a RawgError when no API key is set', async () => {
    await expect(searchGames('zelda', undefined)).rejects.toBeInstanceOf(RawgError);
  });
});
