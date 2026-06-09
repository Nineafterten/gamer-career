import { describe, it, expect } from 'vitest';
import { PRESETS, getPreset, needsReview } from './presets';
import { makeGame } from '../test/utils';

describe('getPreset', () => {
  it('returns the matching preset', () => {
    expect(getPreset('backlog').chart).toBe('backlog');
    expect(getPreset('favorites').chart).toBe('genre');
    expect(getPreset('needs_review').chart).toBe('review');
  });
  it('falls back to "all" for null or unknown keys', () => {
    expect(getPreset(null).key).toBe('all');
    expect(getPreset('does-not-exist').key).toBe('all');
  });
});

describe('preset matchers', () => {
  it('match the right games', () => {
    expect(PRESETS.backlog.match(makeGame({ status: 'backlog' }))).toBe(true);
    expect(PRESETS.favorites.match(makeGame({ favorite: true }))).toBe(true);
    expect(PRESETS.all.match(makeGame())).toBe(true);
  });

  it('In Play is active/passive only (no paused)', () => {
    expect(PRESETS.in_play.match(makeGame({ status: 'active' }))).toBe(true);
    expect(PRESETS.in_play.match(makeGame({ status: 'passive' }))).toBe(true);
    expect(PRESETS.in_play.match(makeGame({ status: 'paused' }))).toBe(false);
    expect(PRESETS.paused.match(makeGame({ status: 'paused' }))).toBe(true);
  });

  it('Completed and Done With are separate', () => {
    expect(PRESETS.completed.match(makeGame({ status: 'completed' }))).toBe(true);
    expect(PRESETS.completed.match(makeGame({ status: 'done_with' }))).toBe(false);
    expect(PRESETS.done_with.match(makeGame({ status: 'done_with' }))).toBe(true);
  });
});

describe('needsReview', () => {
  it('flags finished games missing a personal score (not abandoned)', () => {
    expect(needsReview(makeGame({ status: 'completed' }))).toBe(true);
    expect(needsReview(makeGame({ status: 'done_with' }))).toBe(true);
    expect(needsReview(makeGame({ status: 'completed', personalScore: 90 }))).toBe(false);
    expect(needsReview(makeGame({ status: 'abandoned' }))).toBe(false);
    expect(needsReview(makeGame({ status: 'backlog' }))).toBe(false);
  });
});
