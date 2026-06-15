import { getSettings, saveSettings } from '../db/database';
import { getAllGames, mergeGames, replaceAllGames } from '../db/repository';
import { BACKUP_VERSION } from '../data/vocab';
import type { BackupFile, GameEntry } from '../types/game';

/** Build the versioned backup envelope from current data. */
export async function buildBackup(): Promise<BackupFile> {
  const [games, settings] = await Promise.all([getAllGames(), getSettings()]);
  // Don't leak the RAWG key into the export by default.
  const { rawgApiKey, ...safeSettings } = settings;
  void rawgApiKey;
  return {
    app: 'gamer-career',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    games,
    settings: safeSettings,
  };
}

function timestampSlug(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`;
}

/** Serialize all data to a downloadable JSON file. */
export async function exportToFile(): Promise<number> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gamer-career-backup-${timestampSlug()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return backup.games.length;
}

export interface ImportResult {
  games: number;
  mode: 'replace' | 'merge';
}

function isGameEntry(value: unknown): value is GameEntry {
  if (!value || typeof value !== 'object') return false;
  const g = value as Record<string, unknown>;
  return (
    typeof g.id === 'string' &&
    typeof g.title === 'string' &&
    Array.isArray(g.statusHistory)
  );
}

/** Parse + validate a backup file and restore it (replace or merge). */
export async function importFromFile(
  file: File,
  mode: 'replace' | 'merge',
): Promise<ImportResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const data = parsed as Partial<BackupFile>;
  if (!data || !Array.isArray(data.games)) {
    throw new Error('This does not look like a Gamer Career backup file.');
  }

  const games = data.games.filter(isGameEntry);
  if (!games.length) {
    throw new Error('No valid game records were found in that file.');
  }

  if (mode === 'replace') {
    await replaceAllGames(games);
  } else {
    await mergeGames(games);
  }

  if (data.settings) {
    const { customLikes, customDislikes, colorScheme, likeLabels, dislikeLabels } =
      data.settings;
    await saveSettings({
      ...(customLikes ? { customLikes } : {}),
      ...(customDislikes ? { customDislikes } : {}),
      ...(colorScheme ? { colorScheme } : {}),
      ...(likeLabels ? { likeLabels } : {}),
      ...(dislikeLabels ? { dislikeLabels } : {}),
    });
  }

  return { games: games.length, mode };
}
