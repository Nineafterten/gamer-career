import { describe, it, expect, vi, afterEach } from 'vitest';
import { titleHistoryToRows } from './openxbl';
// The Netlify function is plain JS outside src/, imported here for a unit test.
import { handler } from '../../netlify/functions/xbox.mjs';

describe('titleHistoryToRows', () => {
  it('maps titles + devices to bulk-import rows', () => {
    const rows = titleHistoryToRows({
      titles: [
        { name: 'Halo Infinite', devices: ['Scarlett', 'XboxOne'] },
        { name: 'Forza Horizon 5', devices: ['Win32'] },
        { title: 'Sea of Thieves' }, // alt field, no devices → default platform
        { name: '' }, // skipped
      ],
    });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      title: 'Halo Infinite',
      platforms: ['Xbox Series X/S', 'Xbox One'],
      status: 'not_started',
    });
    expect(rows[1].platforms).toEqual(['PC']);
    expect(rows[2].platforms).toEqual(['Xbox Series X/S']); // fallback
  });

  it('returns [] for an unexpected shape', () => {
    expect(titleHistoryToRows(null)).toEqual([]);
    expect(titleHistoryToRows({})).toEqual([]);
  });
});

describe('xbox proxy handler', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('503s when OPENXBL_KEY is not set', async () => {
    vi.stubEnv('OPENXBL_KEY', '');
    const res = await handler({ queryStringParameters: { path: '/api/v2/account' } });
    expect(res.statusCode).toBe(503);
  });

  it('400s for a path outside /api/v2/', async () => {
    vi.stubEnv('OPENXBL_KEY', 'k');
    const res = await handler({ queryStringParameters: { path: '/evil' } });
    expect(res.statusCode).toBe(400);
  });

  it('forwards a valid path with the key header', async () => {
    vi.stubEnv('OPENXBL_KEY', 'secret');
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ status: 200, text: async () => '{"ok":true}' });
    vi.stubGlobal('fetch', fetchMock);

    const res = await handler({ queryStringParameters: { path: '/api/v2/account' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('ok');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.xbl.io/api/v2/account',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Authorization': 'secret' }),
      }),
    );
  });
});
