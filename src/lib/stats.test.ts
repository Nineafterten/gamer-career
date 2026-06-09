import { describe, it, expect } from 'vitest';
import {
  computeKpis,
  daysBetween,
  daysHeldBeforeAbandon,
  daysInBacklog,
  inPlaySince,
  playTimeDays,
  playTimeLabel,
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

describe('daysBetween', () => {
  it('is 0 for the same instant', () => {
    const t = '2025-01-01T00:00:00.000Z';
    expect(daysBetween(t, t)).toBe(0);
  });

  it('rounds the day difference', () => {
    expect(
      daysBetween('2025-01-01T00:00:00.000Z', '2025-01-11T00:00:00.000Z'),
    ).toBe(10);
  });

  it('never goes negative', () => {
    expect(
      daysBetween('2025-01-11T00:00:00.000Z', '2025-01-01T00:00:00.000Z'),
    ).toBe(0);
  });
});

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

describe('play time', () => {
  it('computes day counts only when both dates are set', () => {
    expect(playTimeDays('2025-01-01', '2025-01-11')).toBe(10);
    expect(playTimeDays('2025-01-01', undefined)).toBeUndefined();
    expect(playTimeDays(undefined, undefined)).toBeUndefined();
  });
  it('labels: day count, TBD (started, no end), or em dash', () => {
    expect(playTimeLabel('2025-01-01', '2025-01-02')).toBe('1 day');
    expect(playTimeLabel('2025-01-01', '2025-01-11')).toBe('10 days');
    expect(playTimeLabel('2025-01-01', undefined)).toBe('TBD');
    expect(playTimeLabel(undefined, undefined)).toBe('—');
  });
});

describe('aging derivations', () => {
  it('daysInBacklog measures time since entering backlog (only when still in backlog)', () => {
    const g = makeGame({
      status: 'backlog',
      statusHistory: history(['not_started', daysAgo(40)], ['backlog', daysAgo(10)]),
    });
    expect(daysInBacklog(g)).toBe(10);
    const notBacklog = makeGame({ status: 'active' });
    expect(daysInBacklog(notBacklog)).toBeUndefined();
  });

  it('inPlaySince uses the first Current-bucket event', () => {
    const g = makeGame({
      status: 'paused',
      statusHistory: history(['active', daysAgo(30)], ['paused', daysAgo(5)]),
    });
    const since = inPlaySince(g);
    expect(since).toBe(daysAgo(30));
  });

  it('daysHeldBeforeAbandon spans first play to the abandon event', () => {
    const g = makeGame({
      status: 'abandoned',
      statusHistory: history(['active', daysAgo(20)], ['abandoned', daysAgo(5)]),
    });
    expect(daysHeldBeforeAbandon(g)).toBe(15);
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
});
