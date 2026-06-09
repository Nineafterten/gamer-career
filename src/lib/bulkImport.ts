import { STATUSES } from '../data/vocab';
import type { GameEntry, PlayStatus } from '../types/game';

/** Map both status values and human labels (plus a few aliases) → PlayStatus. */
const STATUS_LOOKUP: Record<string, PlayStatus> = (() => {
  const m: Record<string, PlayStatus> = {};
  for (const s of STATUSES) {
    m[s.value] = s.value;
    m[s.label.toLowerCase()] = s.value;
  }
  m['done'] = 'done_with';
  m['playing'] = 'active';
  m['beaten'] = 'completed';
  m['finished'] = 'completed';
  m['todo'] = 'not_started';
  m['to play'] = 'not_started';
  return m;
})();

export function statusFromLabel(input: string | undefined): PlayStatus | null {
  if (!input) return null;
  return STATUS_LOOKUP[input.trim().toLowerCase()] ?? null;
}

export interface ParsedRow {
  title: string;
  platforms: string[];
  status: PlayStatus;
  statusRecognized: boolean;
  favorite?: boolean;
  personalScore?: number; // 0-100
  series?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
}

/** Stable key for duplicate detection: normalized title + sorted platforms. */
export function dedupeKey(title: string, platforms: string[]): string {
  const t = title.trim().toLowerCase().replace(/\s+/g, ' ');
  const p = platforms.map((x) => x.trim().toLowerCase()).sort().join('|');
  return `${t}@@${p}`;
}

function parsePlatforms(value: string): string[] {
  return value
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toScore(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  if (Number.isNaN(n)) return undefined;
  // Accept either a 0-10 personal scale (×10) or an already-0-100 value.
  return n <= 10 ? Math.round(n * 10) : Math.round(n);
}

function toBool(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'star', '★'].includes(s)) return true;
  if (['false', 'no', 'n', '0', ''].includes(s)) return false;
  return undefined;
}

function makeRow(input: {
  title: string;
  platforms: string[];
  status?: string;
  favorite?: unknown;
  score?: unknown;
  series?: string;
}): ParsedRow {
  const resolved = statusFromLabel(input.status);
  return {
    title: input.title.trim(),
    platforms: input.platforms,
    status: resolved ?? 'not_started',
    statusRecognized: input.status ? resolved !== null : true,
    favorite: toBool(input.favorite),
    personalScore: toScore(input.score),
    series: input.series?.trim() || undefined,
  };
}

/* ------------------------------- CSV ------------------------------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const HEADER_ALIASES: Record<string, string[]> = {
  title: ['title', 'name', 'game'],
  platform: ['platform', 'platforms', 'console', 'system', 'format'],
  status: ['status', 'play status', 'playstatus'],
  favorite: ['favorite', 'favourite', 'fav'],
  score: ['score', 'rating', 'my score', 'personal score'],
  series: ['series', 'franchise'],
};

function findCol(header: string[], key: string): number {
  for (const alias of HEADER_ALIASES[key]) {
    const i = header.indexOf(alias);
    if (i >= 0) return i;
  }
  return -1;
}

function parseCsvRows(text: string): ParseResult {
  const grid = parseCsv(text);
  const errors: string[] = [];
  if (!grid.length) return { rows: [], errors: ['No rows found.'] };

  const first = grid[0].map((c) => c.trim().toLowerCase());
  const hasHeader = HEADER_ALIASES.title.some((a) => first.includes(a));

  const cols = hasHeader
    ? {
        title: findCol(first, 'title'),
        platform: findCol(first, 'platform'),
        status: findCol(first, 'status'),
        favorite: findCol(first, 'favorite'),
        score: findCol(first, 'score'),
        series: findCol(first, 'series'),
      }
    : { title: 0, platform: 1, status: 2, favorite: -1, score: -1, series: -1 };

  const dataRows = hasHeader ? grid.slice(1) : grid;
  const rows: ParsedRow[] = [];

  dataRows.forEach((cells, idx) => {
    const get = (i: number) => (i >= 0 ? (cells[i] ?? '').trim() : '');
    const title = get(cols.title);
    if (!title) {
      errors.push(`Row ${idx + 1}: missing title — skipped.`);
      return;
    }
    rows.push(
      makeRow({
        title,
        platforms: parsePlatforms(get(cols.platform)),
        status: get(cols.status),
        favorite: get(cols.favorite),
        score: get(cols.score),
        series: get(cols.series),
      }),
    );
  });

  return { rows, errors };
}

/* ------------------------------- JSON ------------------------------ */

function parseJsonRows(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { rows: [], errors: ['Invalid JSON.'] };
  }
  const list = Array.isArray(data) ? data : [data];
  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Item ${idx + 1}: not an object — skipped.`);
      return;
    }
    const o = item as Record<string, unknown>;
    const title = String(o.title ?? o.name ?? '').trim();
    if (!title) {
      errors.push(`Item ${idx + 1}: missing title — skipped.`);
      return;
    }
    const platformsRaw = o.platforms ?? o.platform ?? o.console;
    const platforms = Array.isArray(platformsRaw)
      ? platformsRaw.map((p) => String(p).trim()).filter(Boolean)
      : parsePlatforms(String(platformsRaw ?? ''));
    rows.push(
      makeRow({
        title,
        platforms,
        status: o.status === undefined ? undefined : String(o.status),
        favorite: o.favorite,
        score: o.score ?? o.personalScore ?? o.rating,
        series: o.series === undefined ? undefined : String(o.series),
      }),
    );
  });

  return { rows, errors };
}

/** Parse pasted CSV or JSON into staging rows. */
export function parseBulk(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], errors: [] };
  return trimmed.startsWith('[') || trimmed.startsWith('{')
    ? parseJsonRows(trimmed)
    : parseCsvRows(trimmed);
}

export type DupKind = 'library' | 'batch' | null;

/** Flag each parsed row as duplicating an existing game or an earlier batch row. */
export function flagDuplicates(
  rows: ParsedRow[],
  existing: GameEntry[],
): DupKind[] {
  const libraryKeys = new Set(existing.map((g) => dedupeKey(g.title, g.platforms)));
  const seen = new Set<string>();
  return rows.map((r) => {
    const key = dedupeKey(r.title, r.platforms);
    if (libraryKeys.has(key)) return 'library';
    if (seen.has(key)) return 'batch';
    seen.add(key);
    return null;
  });
}
