import { describe, it, expect } from 'vitest';
import {
  PRESETS,
  getPreset,
  needsAbandonReason,
  needsArt,
  needsReview,
  needsScore,
} from './presets';
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

describe('needs-review reasons', () => {
  const art = 'https://example.com/cover.jpg';

  it('needsScore: finished games without a personal score', () => {
    expect(needsScore(makeGame({ status: 'completed' }))).toBe(true);
    expect(needsScore(makeGame({ status: 'done_with' }))).toBe(true);
    expect(needsScore(makeGame({ status: 'completed', personalScore: 90 }))).toBe(false);
    expect(needsScore(makeGame({ status: 'backlog' }))).toBe(false);
  });

  it('needsArt: any record missing a cover image', () => {
    expect(needsArt(makeGame({ coverImageUrl: undefined }))).toBe(true);
    expect(needsArt(makeGame({ coverImageUrl: art }))).toBe(false);
  });

  it('needsAbandonReason: abandoned with no dislike tags', () => {
    expect(needsAbandonReason(makeGame({ status: 'abandoned' }))).toBe(true);
    expect(needsAbandonReason(makeGame({ status: 'abandoned', dislikes: ['Grind'] }))).toBe(false);
    expect(needsAbandonReason(makeGame({ status: 'completed' }))).toBe(false);
  });

  it('needsReview is the union of every reason', () => {
    // Tidy: finished, scored, has art → no reason to review.
    expect(
      needsReview(makeGame({ status: 'completed', personalScore: 90, coverImageUrl: art })),
    ).toBe(false);
    // Missing art alone is enough.
    expect(needsReview(makeGame({ status: 'backlog', coverImageUrl: undefined }))).toBe(true);
    // Abandoned with art but no dislike reason.
    expect(needsReview(makeGame({ status: 'abandoned', coverImageUrl: art }))).toBe(true);
    // Finished with art but no score.
    expect(needsReview(makeGame({ status: 'done_with', coverImageUrl: art }))).toBe(true);
  });
});
