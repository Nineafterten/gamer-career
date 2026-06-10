import { describe, it, expect } from 'vitest';
import { applyTagEdit, computeBulkPatch } from './bulkEdit';
import { makeGame } from '../test/utils';

describe('applyTagEdit', () => {
  it('add merges and de-dupes', () => {
    expect(applyTagEdit(['PC'], { mode: 'add', values: ['PS5', 'PC'] })).toEqual(['PC', 'PS5']);
  });
  it('remove strips the given values', () => {
    expect(applyTagEdit(['PC', 'PS5', 'Xbox'], { mode: 'remove', values: ['PS5'] })).toEqual([
      'PC',
      'Xbox',
    ]);
  });
  it('replace overwrites entirely', () => {
    expect(applyTagEdit(['PC', 'PS5'], { mode: 'replace', values: ['Switch'] })).toEqual([
      'Switch',
    ]);
  });
});

describe('computeBulkPatch', () => {
  it('only touches keys present in the spec', () => {
    const g = makeGame({ series: 'Halo', favorite: false });
    const patch = computeBulkPatch(g, { favorite: true });
    expect(patch).toEqual({ favorite: true });
  });

  it('clears text fields with empty strings', () => {
    const g = makeGame({ series: 'Halo', noteworthy: 'note' });
    const patch = computeBulkPatch(g, { series: '', noteworthy: '   ' });
    expect(patch.series).toBeUndefined();
    expect(patch.noteworthy).toBeUndefined();
  });

  it('sets and clears scalars and links', () => {
    const g = makeGame();
    expect(computeBulkPatch(g, { publisher: 'Nintendo' }).publisher).toBe('Nintendo');
    expect(computeBulkPatch(g, { excludeFromStats: false }).excludeFromStats).toBeUndefined();
    expect(computeBulkPatch(g, { collectionId: 'c1' }).collectionId).toBe('c1');
    expect(computeBulkPatch(g, { collectionId: null }).collectionId).toBeUndefined();
  });

  it('merges tag fields against the record', () => {
    const g = makeGame({ platforms: ['PC'], genres: ['Action'] });
    const patch = computeBulkPatch(g, {
      platforms: { mode: 'add', values: ['PS5'] },
      genres: { mode: 'replace', values: ['RPG'] },
    });
    expect(patch.platforms).toEqual(['PC', 'PS5']);
    expect(patch.genres).toEqual(['RPG']);
  });

  it('never links a record to itself as a variant', () => {
    const g = makeGame({ id: 'g1' });
    expect(computeBulkPatch(g, { variantOfId: 'g1' }).variantOfId).toBeUndefined();
    expect('variantOfId' in computeBulkPatch(g, { variantOfId: 'g1' })).toBe(false);
    expect(computeBulkPatch(g, { variantOfId: 'other' }).variantOfId).toBe('other');
  });

  it('does not make a collection a member or a variant', () => {
    const c = makeGame({ id: 'col', isCollection: true });
    const patch = computeBulkPatch(c, { collectionId: 'x', variantOfId: 'y' });
    expect('collectionId' in patch).toBe(false);
    expect('variantOfId' in patch).toBe(false);
  });
});
