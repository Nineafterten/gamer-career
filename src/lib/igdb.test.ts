import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicScore } from './igdb';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(body: unknown, ok = true) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  } as Response);
}

describe('getPublicScore', () => {
  it('prefers the community rating and rounds it', async () => {
    mockFetch([{ id: 1, name: 'Mega Man X', rating: 88.6, aggregated_rating: 75 }]);
    expect(await getPublicScore('Mega Man X')).toBe(89);
  });

  it('falls back to the critic aggregate when there is no member rating', async () => {
    mockFetch([{ id: 1, name: 'Mega Man X', aggregated_rating: 82.2 }]);
    expect(await getPublicScore('Mega Man X')).toBe(82);
  });

  it('matches the right result by normalized title', async () => {
    mockFetch([
      { id: 1, name: 'Mega Man', rating: 50 },
      { id: 2, name: 'Mega Man X', rating: 90 },
    ]);
    expect(await getPublicScore('Mega Man X')).toBe(90);
  });

  it('returns undefined when there are no results', async () => {
    mockFetch([]);
    expect(await getPublicScore('Nonexistent Game')).toBeUndefined();
  });

  it('returns undefined when the proxy is not reachable (keeps existing score)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await getPublicScore('Halo')).toBeUndefined();
  });

  it('returns undefined when the proxy is not configured (503)', async () => {
    mockFetch({ error: 'not configured' }, false);
    expect(await getPublicScore('Halo')).toBeUndefined();
  });
});
