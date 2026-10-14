import { describe, it, expect, vi } from 'vitest';
import worker from './index.mjs';

describe('worker routing', () => {
  const env = () => ({ ASSETS: { fetch: vi.fn(async () => new Response('asset')) } });

  it('sends /api/xbox and /api/igdb to the proxies', async () => {
    const e = env();
    const xbox = await worker.fetch(new Request('https://example.test/api/xbox?path=/api/v2/account'), e);
    const igdb = await worker.fetch(new Request('https://example.test/api/igdb?q=Hades'), e);
    expect(xbox.status).toBe(503);
    expect(igdb.status).toBe(503);
    expect(e.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('hands every other path to the static assets', async () => {
    const e = env();
    const res = await worker.fetch(new Request('https://example.test/api/other'), e);
    expect(await res.text()).toBe('asset');
    expect(e.ASSETS.fetch).toHaveBeenCalledOnce();
  });
});
