import { describe, it, expect, vi, afterEach } from 'vitest';
import { titleHistoryToRows } from './openxbl';
// The Worker's proxy is plain JS outside src/, imported here for a unit test.
import { handleXbox } from '../../worker/xbox.mjs';

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

  it('unwraps OpenXBL’s { content, code } envelope', () => {
    const rows = titleHistoryToRows({
      content: { titles: [{ name: 'Hades', devices: ['Scarlett'] }] },
      code: 200,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: 'Hades', platforms: ['Xbox Series X/S'] });
  });

  it('returns [] for an unexpected shape', () => {
    expect(titleHistoryToRows(null)).toEqual([]);
    expect(titleHistoryToRows({})).toEqual([]);
  });
});

describe('xbox proxy handler', () => {
  const call = (path: string, env: Record<string, string> = {}) =>
    handleXbox(new URL(`https://example.test/api/xbox?path=${encodeURIComponent(path)}`), env);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('503s when OPENXBL_KEY is not set', async () => {
    const res = await call('/api/v2/account');
    expect(res.status).toBe(503);
  });

  it('400s for a path outside /api/v2/', async () => {
    const res = await call('/evil', { OPENXBL_KEY: 'k' });
    expect(res.status).toBe(400);
  });

  it('forwards a valid path with the key header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ status: 200, text: async () => '{"ok":true}' });
    vi.stubGlobal('fetch', fetchMock);

    const res = await call('/api/v2/account', { OPENXBL_KEY: 'secret' });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('ok');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://xbl.io/api/v2/account',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Authorization': 'secret' }),
      }),
    );
  });
});
