// Client for the Xbox (OpenXBL) sync — talks to our own Netlify proxy
// (/api/xbox), never to xbl.io directly. See netlify/functions/xbox.mjs.

import type { ParsedRow } from './bulkImport';

const PROXY = '/api/xbox';

export class OpenXblError extends Error {}

async function xbl<T = unknown>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${PROXY}?path=${encodeURIComponent(path)}`);
  } catch {
    throw new OpenXblError(
      'Could not reach the Xbox proxy. It only runs on the deployed site (or via `netlify dev`).',
    );
  }
  if (res.status === 503) {
    throw new OpenXblError(
      'Xbox sync is not set up yet — the OPENXBL_KEY needs to be configured on the site.',
    );
  }
  if (res.status === 401) {
    throw new OpenXblError('OpenXBL rejected the key. Re-check it on the site settings.');
  }
  if (!res.ok) {
    throw new OpenXblError(`Xbox request failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

/** The key owner's own Xbox profile. */
export function getProfile(): Promise<unknown> {
  return xbl('/api/v2/account');
}

/**
 * The key owner's title (game) history. NOTE: confirm this exact path against
 * your live OpenXBL key — the proxy is generic, so only this string may need a
 * tweak if OpenXBL names it differently.
 */
export function getTitleHistory(): Promise<unknown> {
  return xbl('/api/v2/player/titleHistory');
}

const DEVICE_PLATFORM: Record<string, string> = {
  Scarlett: 'Xbox Series X/S',
  XboxSeries: 'Xbox Series X/S',
  XboxOne: 'Xbox One',
  Xbox360: 'Xbox 360',
  Win32: 'PC',
  PC: 'PC',
};

function mapDevices(devices: unknown): string[] {
  if (!Array.isArray(devices)) return [];
  const mapped = devices
    .map((d) => DEVICE_PLATFORM[String(d)] ?? null)
    .filter((d): d is string => Boolean(d));
  return Array.from(new Set(mapped));
}

/**
 * Map an OpenXBL title-history response into Bulk Add rows (reusing the same
 * staging/dedupe pipeline). Defensive about field names since the live shape
 * is only confirmable with a real key.
 */
export function titleHistoryToRows(data: unknown): ParsedRow[] {
  const root = data as Record<string, unknown> | undefined;
  const titles = (root?.titles ?? root?.titleHistory ?? []) as Array<
    Record<string, unknown>
  >;
  if (!Array.isArray(titles)) return [];

  return titles
    .map((t): ParsedRow | null => {
      const name = String(t?.name ?? t?.title ?? '').trim();
      if (!name) return null;
      const platforms = mapDevices(t?.devices);
      return {
        title: name,
        platforms: platforms.length ? platforms : ['Xbox Series X/S'],
        status: 'not_started',
        statusRecognized: true,
      };
    })
    .filter((r): r is ParsedRow => r !== null);
}
