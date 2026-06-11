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
    expect(p.publicScore).toBe(90); // the Metacritic critic score
    expect(p.genres).toEqual(['Metroidvania']);
    expect(p.platforms).toContain('Switch'); // normalized from "Nintendo Switch"
    expect(p.rawgId).toBe(42);
  });

  it('leaves the public score blank when there is no Metacritic score', () => {
    // The community rating is unreliable for retro games, so we no longer use it.
    const p = toPublicFields({ ...base, metacritic: null, rating: 4 });
    expect(p.publicScore).toBeUndefined();
  });

  it('always defaults the reference link to Wikipedia (ignores RAWG website)', () => {
    const p = toPublicFields(base); // base has website: hollowknight.com
    expect(p.wikiUrl).toContain('en.wikipedia.org');
    expect(p.wikiUrl).not.toContain('hollowknight.com');
  });
});

describe('searchGames', () => {
  it('throws a RawgError when no API key is set', async () => {
    await expect(searchGames('zelda', undefined)).rejects.toBeInstanceOf(RawgError);
  });
});
