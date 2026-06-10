import { describe, it, expect } from 'vitest';
import { computeKpis, inPlaySince, scoreHistogram, toDisplayScore } from './stats';
import { makeGame, daysAgo } from '../test/utils';
import { bucketOf } from '../data/vocab';
import type { StatusEvent } from '../types/game';

function history(...events: Array<[string, string]>): StatusEvent[] {
  return events.map(([status, at]) => ({
    status: status as never,
    bucket: bucketOf(status as never),
    at,
  }));
}

describe('toDisplayScore', () => {
  it('shows an em dash when unset', () => {
    expect(toDisplayScore(undefined)).toBe('—');
  });
  it('converts 0-100 to a one-decimal 0-10', () => {
    expect(toDisplayScore(95)).toBe('9.5');
    expect(toDisplayScore(80)).toBe('8.0');
  });
});

describe('scoreHistogram', () => {
  it('bins mine and public scores into ten buckets (100 lands in the top)', () => {
    const bins = scoreHistogram([
      makeGame({ personalScore: 95, publicScore: 92 }), // both bin 9
      makeGame({ personalScore: 85 }), // bin 8
      makeGame({ personalScore: 100 }), // clamps to bin 9
    ]);
    expect(bins).toHaveLength(10);
    expect(bins[9].mine).toBe(2);
    expect(bins[8].mine).toBe(1);
    expect(bins[9].public).toBe(1);
    expect(bins[0].mine).toBe(0);
  });
});

describe('inPlaySince', () => {
  it('uses the first Current-bucket event', () => {
    const g = makeGame({
      status: 'paused',
      statusHistory: history(['active', daysAgo(30)], ['paused', daysAgo(5)]),
    });
    expect(inPlaySince(g)).toBe(daysAgo(30));
  });

  it('is undefined when the game is not in a Current state', () => {
    expect(inPlaySince(makeGame({ status: 'backlog' }))).toBeUndefined();
  });
});

describe('computeKpis', () => {
  const art = 'https://example.com/cover.jpg';

  it('aggregates counts, averages, and completion rate', () => {
    // All have cover art, so needsReview isolates score/abandon-reason gaps.
    const games = [
      makeGame({ status: 'completed', favorite: true, personalScore: 90, publicScore: 80, coverImageUrl: art }),
      makeGame({ status: 'done_with', publicScore: 70, coverImageUrl: art }), // no score → review
      makeGame({ status: 'backlog', coverImageUrl: art }),
      makeGame({ status: 'active', coverImageUrl: art }),
      makeGame({ status: 'abandoned', coverImageUrl: art }), // no dislikes → review
    ];
    const k = computeKpis(games);
    expect(k.total).toBe(5);
    expect(k.unique).toBe(5); // no variants
    expect(k.repeats).toBe(0);
    expect(k.completed).toBe(1);
    expect(k.doneWith).toBe(1);
    expect(k.closedPositive).toBe(2);
    expect(k.backlog).toBe(1);
    expect(k.inPlay).toBe(1); // active + passive
    expect(k.paused).toBe(0);
    expect(k.abandoned).toBe(1);
    expect(k.needsReview).toBe(2); // done_with (no score) + abandoned (no reason)
    expect(k.favorites).toBe(1);
    expect(k.avgPersonal).toBe(90);
    expect(k.avgPublic).toBe(75);
    expect(k.completionRate).toBeCloseTo(2 / 5);
  });

  it('splits unique vs repeats from variant links', () => {
    const canonical = makeGame({ title: 'Minecraft', coverImageUrl: art });
    const games = [
      canonical,
      makeGame({ title: 'Minecraft: Bedrock', variantOfId: canonical.id, coverImageUrl: art }),
      makeGame({ title: 'Minecraft: Console', variantOfId: canonical.id, coverImageUrl: art }),
      makeGame({ title: 'Halo', coverImageUrl: art }),
    ];
    const k = computeKpis(games);
    expect(k.total).toBe(4); // every record is real time spent
    expect(k.repeats).toBe(2); // two variant editions
    expect(k.unique).toBe(2); // Minecraft (canonical) + Halo
  });

  it('excludes entries flagged excludeFromStats (collection members)', () => {
    const games = [
      makeGame({ status: 'completed', favorite: true, personalScore: 80 }),
      makeGame({
        status: 'completed',
        favorite: true,
        personalScore: 100,
        excludeFromStats: true,
      }),
    ];
    const k = computeKpis(games);
    expect(k.total).toBe(1);
    expect(k.favorites).toBe(1);
    expect(k.completed).toBe(1);
    expect(k.avgPersonal).toBe(80);
  });

});
