import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleIgdb } from './igdb.mjs';

describe('igdb proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes Twitch’s error message through when the token request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"status":400,"message":"invalid client"}',
      }),
    );
    const res = await handleIgdb(new URL('https://example.test/api/igdb?q=Hades'), {
      TWITCH_CLIENT_ID: 'id',
      TWITCH_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(502);
    expect(await res.text()).toContain('invalid client');
  });
});
