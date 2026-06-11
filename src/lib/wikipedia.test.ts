import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveWikipediaUrl, wikipediaSearchUrl } from './wikipedia';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('wikipediaSearchUrl', () => {
  it('builds an encoded en.wikipedia search link', () => {
    const url = wikipediaSearchUrl('Mega Man X');
    expect(url).toContain('en.wikipedia.org/wiki/Special:Search');
    expect(url).toContain('Mega%20Man%20X');
  });
});

describe('resolveWikipediaUrl', () => {
  it('returns the top article URL from opensearch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        'Mega Man X',
        ['Mega Man X'],
        [''],
        ['https://en.wikipedia.org/wiki/Mega_Man_X'],
      ],
    } as Response);
    expect(await resolveWikipediaUrl('Mega Man X')).toBe(
      'https://en.wikipedia.org/wiki/Mega_Man_X',
    );
  });

  it('falls back to a search link when nothing matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ['Nope', [], [], []],
    } as Response);
    expect(await resolveWikipediaUrl('Nope')).toContain('Special:Search');
  });

  it('falls back to a search link when the request throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await resolveWikipediaUrl('Halo')).toBe(wikipediaSearchUrl('Halo'));
  });
});
