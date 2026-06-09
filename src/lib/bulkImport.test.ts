import { describe, it, expect } from 'vitest';
import {
  canonTitle,
  flagDuplicates,
  normalizeTitle,
  parseBulk,
  statusFromLabel,
} from './bulkImport';
import { makeGame } from '../test/utils';

describe('statusFromLabel', () => {
  it('maps labels, values, and aliases', () => {
    expect(statusFromLabel('Completed')).toBe('completed');
    expect(statusFromLabel('done_with')).toBe('done_with');
    expect(statusFromLabel('playing')).toBe('active');
    expect(statusFromLabel('nonsense')).toBeNull();
  });
});

describe('normalizeTitle', () => {
  it('is case- and whitespace-insensitive', () => {
    expect(normalizeTitle('  Hollow   Knight ')).toBe(normalizeTitle('hollow knight'));
  });
});

describe('canonTitle', () => {
  it('equates number-words/roman numerals but keeps distinct sequels apart', () => {
    expect(canonTitle('Unravel Two')).toBe(canonTitle('Unravel 2'));
    expect(canonTitle('Final Fantasy VI')).toBe(canonTitle('Final Fantasy 6'));
    expect(canonTitle('Halo: Infinite')).toBe(canonTitle('Halo Infinite'));
    // The classic mismatch we want flagged, not auto-applied:
    expect(canonTitle('Street Fighter 6')).not.toBe(canonTitle('Street Fighter (1987)'));
  });
});

describe('parseBulk (CSV)', () => {
  it('parses a header row and recognizes columns', () => {
    const csv = [
      'Title,Platform,Play Status,Score',
      'Hades,Xbox One,Completed,9',
      '"Mass Effect, Legendary",PC,backlog,',
    ].join('\n');
    const { rows, errors } = parseBulk(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: 'Hades',
      platforms: ['Xbox One'],
      status: 'completed',
      personalScore: 90, // 9 → 90
    });
    expect(rows[1].title).toBe('Mass Effect, Legendary'); // quoted comma preserved
    expect(rows[1].status).toBe('backlog');
  });

  it('falls back to positional columns without a header', () => {
    const { rows } = parseBulk('Tetris,Game Boy,completed');
    expect(rows[0]).toMatchObject({
      title: 'Tetris',
      platforms: ['Game Boy'],
      status: 'completed',
    });
  });

  it('splits multiple platforms on semicolons and flags bad statuses', () => {
    const { rows } = parseBulk('Title,Platform,Status\nHalo,Xbox;PC,whoops');
    expect(rows[0].platforms).toEqual(['Xbox', 'PC']);
    expect(rows[0].status).toBe('not_started');
    expect(rows[0].statusRecognized).toBe(false);
  });
});

describe('parseBulk (JSON)', () => {
  it('parses an array of objects', () => {
    const json = JSON.stringify([
      { title: 'Celeste', platforms: ['Switch'], status: 'completed', score: 95 },
      { name: 'Hollow Knight', platform: 'PC', status: 'backlog' },
    ]);
    const { rows } = parseBulk(json);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ title: 'Celeste', personalScore: 95 });
    expect(rows[1].platforms).toEqual(['PC']);
  });
});

describe('flagDuplicates', () => {
  it('flags library and within-batch duplicates', () => {
    const existing = [makeGame({ title: 'Hades', platforms: ['Xbox'] })];
    const { rows } = parseBulk(
      ['Title,Platform', 'Hades,Xbox', 'Celeste,Switch', 'Celeste,Switch'].join('\n'),
    );
    const flags = flagDuplicates(rows, existing);
    expect(flags[0]).toBe('library');
    expect(flags[1]).toBeNull();
    expect(flags[2]).toBe('batch');
  });

  it('matches a library record by its original sourceTitle after a title rewrite', () => {
    // Enriched display title differs, but the original import title is preserved.
    const existing = [makeGame({ title: 'Unravel 2', sourceTitle: 'Unravel Two' })];
    const { rows } = parseBulk('Title,Platform\nUnravel Two,Xbox Series X/S');
    expect(flagDuplicates(rows, existing)[0]).toBe('library');
  });

  it('ignores platform drift (single manual entry vs multi-platform sync)', () => {
    const existing = [makeGame({ title: 'Hades', platforms: ['Xbox One'] })];
    const { rows } = parseBulk('Title,Platform\nHades,PC;Xbox Series X/S');
    expect(flagDuplicates(rows, existing)[0]).toBe('library');
  });
});
