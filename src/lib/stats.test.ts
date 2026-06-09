import { describe, it, expect } from 'vitest';
import {
  computeKpis,
  inPlaySince,
  repeatsCount,
  scoreHistogram,
  toDisplayScore,
} from './stats';
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

describe('repeatsCount', () => {
  it('counts titles present both standalone and as a collection member', () => {
    const games = [
      makeGame({ title: 'Assassin’s Creed II' }), // standalone
      makeGame({ title: 'Assassin’s Creed II', collectionId: 'ezio', excludeFromStats: true }), // member
      makeGame({ id: 'ezio', title: 'The Ezio Collection', isCollection: true }), // container — skipped
      makeGame({ title: 'Halo' }), // standalone only
    ];
    expect(repeatsCount(games)).toBe(1);
  });

  it('matches across number-word/roman differences and is 0 with no overlap', () => {
    const repeated = [
      makeGame({ title: 'Final Fantasy VII' }), // standalone
      makeGame({ title: 'Final Fantasy 7', collectionId: 'c' }), // member, same canon title
    ];
    expect(repeatsCount(repeated)).toBe(1);

    const distinct = [
      makeGame({ title: 'Halo' }),
      makeGame({ title: 'Doom', collectionId: 'c' }),
    ];
    expect(repeatsCount(distinct)).toBe(0);
  });
});

describe('computeKpis', () => {
  it('aggregates counts, averages, and completion rate', () => {
    const games = [
      makeGame({ status: 'completed', favorite: true, personalScore: 90, publicScore: 80 }),
      makeGame({ status: 'done_with', publicScore: 70 }),
      makeGame({ status: 'backlog' }),
      makeGame({ status: 'active' }),
      makeGame({ status: 'abandoned' }),
    ];
    const k = computeKpis(games);
    expect(k.total).toBe(5);
    expect(k.completed).toBe(1);
    expect(k.doneWith).toBe(1);
    expect(k.closedPositive).toBe(2);
    expect(k.backlog).toBe(1);
    expect(k.inPlay).toBe(1); // active + passive
    expect(k.paused).toBe(0);
    expect(k.abandoned).toBe(1);
    expect(k.needsReview).toBe(1); // the done_with game has no personal score
    expect(k.favorites).toBe(1);
    expect(k.repeats).toBe(0);
    expect(k.avgPersonal).toBe(90);
    expect(k.avgPublic).toBe(75);
    expect(k.completionRate).toBeCloseTo(2 / 5);
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

  it('counts repeats from the full library, even excludeFromStats members', () => {
    const games = [
      makeGame({ title: 'Assassin’s Creed II', status: 'completed' }),
      makeGame({
        title: 'Assassin’s Creed II',
        status: 'completed',
        collectionId: 'ezio',
        excludeFromStats: true,
      }),
    ];
    const k = computeKpis(games);
    expect(k.total).toBe(1); // the excluded member doesn't inflate the total
    expect(k.repeats).toBe(1); // …but it still registers as a repeat
  });
});
