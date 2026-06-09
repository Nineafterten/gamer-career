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
  // On the local dev server the /api/xbox route falls through to the SPA's
  // index.html, so guard against a non-JSON (HTML) body with a clear message.
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new OpenXblError(
      'Xbox sync only runs on the deployed site (or via `netlify dev`), not the plain dev server.',
    );
  }
}

interface AccountResponse {
  profileUsers?: Array<{ id?: string }>;
}

/** The key owner's own Xbox profile. */
export function getProfile(): Promise<AccountResponse> {
  return xbl<AccountResponse>('/api/v2/account');
}

/** Resolve the key owner's XUID (needed by the title-history endpoint). */
async function getXuid(): Promise<string> {
  const data = await getProfile();
  const xuid = data?.profileUsers?.[0]?.id;
  if (!xuid) {
    throw new OpenXblError('Could not read your Xbox profile (no XUID returned).');
  }
  return xuid;
}

/**
 * The key owner's title (game) history. Per the OpenXBL OpenAPI spec the path is
 * /api/v2/player/titleHistory/{xuid}, so we resolve the XUID from the account first.
 */
export async function getTitleHistory(): Promise<unknown> {
  const xuid = await getXuid();
  return xbl(`/api/v2/player/titleHistory/${xuid}`);
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
