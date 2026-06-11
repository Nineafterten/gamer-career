import type { GameEntry, PlayStatus } from '../types/game';

export type TagMode = 'add' | 'remove' | 'replace';

export interface TagEdit {
  mode: TagMode;
  values: string[];
}

/**
 * A bulk edit applied to many records at once. Only the keys that are present
 * are written — absent keys leave each record's value untouched. This mirrors
 * the BulkEditModal, which omits fields whose "change this" switch is off.
 */
export interface BulkEditSpec {
  series?: string; // '' clears
  publisher?: string; // '' clears
  noteworthy?: string; // '' clears
  status?: PlayStatus;
  favorite?: boolean;
  excludeFromStats?: boolean;
  hidden?: boolean;
  collectionId?: string | null; // null clears
  variantOfId?: string | null; // null clears
  platforms?: TagEdit;
  genres?: TagEdit;
  likes?: TagEdit;
  dislikes?: TagEdit;
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

/** Merge a tag edit into a record's existing list of values. */
export function applyTagEdit(existing: string[], edit: TagEdit): string[] {
  switch (edit.mode) {
    case 'add':
      return uniq([...existing, ...edit.values]);
    case 'remove': {
      const drop = new Set(edit.values);
      return existing.filter((v) => !drop.has(v));
    }
    case 'replace':
      return uniq(edit.values);
    default:
      return existing;
  }
}

/**
 * Compute the field changes a spec applies to one record. Returns only the
 * changed scalar/tag/status fields — the caller (repository) owns `statusHistory`
 * and `updatedAt`. Empty strings clear text fields; `null` clears the collection
 * / variant links. Guards: a record never links to itself as a variant, and a
 * collection can't become a collection member or a variant of something.
 */
export function computeBulkPatch(
  game: GameEntry,
  spec: BulkEditSpec,
): Partial<GameEntry> {
  const patch: Partial<GameEntry> = {};

  if (spec.series !== undefined) patch.series = spec.series.trim() || undefined;
  if (spec.publisher !== undefined) patch.publisher = spec.publisher.trim() || undefined;
  if (spec.noteworthy !== undefined) patch.noteworthy = spec.noteworthy.trim() || undefined;

  if (spec.status !== undefined) {
    patch.status = spec.status;
    // You can't rate a game you abandoned — clear any existing score.
    if (spec.status === 'abandoned') patch.personalScore = undefined;
  }
  if (spec.favorite !== undefined) patch.favorite = spec.favorite;
  if (spec.excludeFromStats !== undefined) {
    patch.excludeFromStats = spec.excludeFromStats || undefined;
  }
  if (spec.hidden !== undefined) patch.hidden = spec.hidden || undefined;

  if (spec.collectionId !== undefined && !game.isCollection) {
    patch.collectionId = spec.collectionId ?? undefined;
  }
  if (
    spec.variantOfId !== undefined &&
    !game.isCollection &&
    spec.variantOfId !== game.id
  ) {
    patch.variantOfId = spec.variantOfId ?? undefined;
  }

  if (spec.platforms) patch.platforms = applyTagEdit(game.platforms, spec.platforms);
  if (spec.genres) patch.genres = applyTagEdit(game.genres, spec.genres);
  if (spec.likes) patch.likes = applyTagEdit(game.likes, spec.likes);
  if (spec.dislikes) patch.dislikes = applyTagEdit(game.dislikes, spec.dislikes);

  return patch;
}
