// Like/dislike label management. Labels are plain strings stored directly on each
// record's `likes`/`dislikes` arrays (the text IS the identity — no IDs). Renames
// and deletes therefore cascade across every record, and the authoritative picker
// list lives in settings (`likeLabels`/`dislikeLabels`), materialized lazily so a
// former default can be renamed/deleted without the hardcoded default resurfacing.

import { DEFAULT_DISLIKES, DEFAULT_LIKES } from '../data/vocab';
import { saveSettings } from '../db/database';
import { deleteLabelFromRecords, renameLabelOnRecords } from '../db/repository';
import type { AppSettings } from '../types/game';

export type LabelKind = 'like' | 'dislike';

export function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

/** Effective like labels: the materialized list when set, else defaults + custom. */
export function resolveLikeLabels(s: AppSettings): string[] {
  return s.likeLabels ?? uniqStrings([...DEFAULT_LIKES, ...s.customLikes]);
}

/** Effective dislike labels: the materialized list when set, else defaults + custom. */
export function resolveDislikeLabels(s: AppSettings): string[] {
  return s.dislikeLabels ?? uniqStrings([...DEFAULT_DISLIKES, ...s.customDislikes]);
}

export function resolveLabels(s: AppSettings, kind: LabelKind): string[] {
  return kind === 'like' ? resolveLikeLabels(s) : resolveDislikeLabels(s);
}

/** Persist the authoritative list for one kind (materializes it). */
function saveList(kind: LabelKind, list: string[]) {
  return saveSettings(kind === 'like' ? { likeLabels: list } : { dislikeLabels: list });
}

/**
 * Register brand-new labels typed into a game form so they appear in the picker.
 * Appends to the authoritative list once materialized, otherwise to the legacy
 * custom list (preserving pre-feature behavior). No-op when nothing is new.
 */
export async function registerNewLabels(
  settings: AppSettings,
  likes: string[],
  dislikes: string[],
): Promise<void> {
  const knownLikes = new Set(resolveLikeLabels(settings));
  const knownDislikes = new Set(resolveDislikeLabels(settings));
  const newLikes = likes.filter((l) => !knownLikes.has(l));
  const newDislikes = dislikes.filter((d) => !knownDislikes.has(d));
  if (!newLikes.length && !newDislikes.length) return;

  const patch: Partial<AppSettings> = {};
  if (newLikes.length) {
    patch[settings.likeLabels ? 'likeLabels' : 'customLikes'] = uniqStrings([
      ...(settings.likeLabels ?? settings.customLikes),
      ...newLikes,
    ]);
  }
  if (newDislikes.length) {
    patch[settings.dislikeLabels ? 'dislikeLabels' : 'customDislikes'] = uniqStrings([
      ...(settings.dislikeLabels ?? settings.customDislikes),
      ...newDislikes,
    ]);
  }
  await saveSettings(patch);
}

/**
 * Add a label from the manage view. `currentLabels` is the full set the UI shows
 * (resolved ∪ in-use) so materializing it doesn't drop orphan in-use labels.
 * Returns false when the label is blank or already present.
 */
export async function addLabel(
  kind: LabelKind,
  label: string,
  currentLabels: string[],
): Promise<boolean> {
  const trimmed = label.trim();
  if (!trimmed || currentLabels.includes(trimmed)) return false;
  await saveList(kind, [...currentLabels, trimmed]);
  return true;
}

/**
 * Rename a label everywhere: cascade across every record, then materialize the
 * authoritative list with the rename applied (deduping, so renaming onto an
 * existing label merges them). Returns the number of records changed.
 */
export async function renameLabel(
  kind: LabelKind,
  from: string,
  to: string,
  currentLabels: string[],
): Promise<number> {
  const trimmed = to.trim();
  if (!trimmed || trimmed === from) return 0;
  const records = await renameLabelOnRecords(kind, from, trimmed);
  const nextList = uniqStrings(currentLabels.map((l) => (l === from ? trimmed : l)));
  await saveList(kind, nextList);
  return records;
}

/** Delete a label everywhere: strip it from every record and drop it from the list. */
export async function deleteLabel(
  kind: LabelKind,
  label: string,
  currentLabels: string[],
): Promise<number> {
  const records = await deleteLabelFromRecords(kind, label);
  await saveList(
    kind,
    currentLabels.filter((l) => l !== label),
  );
  return records;
}
