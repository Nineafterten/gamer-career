import { describe, it, expect } from 'vitest';
import {
  BUCKETS,
  STATUSES,
  STATUS_BY_VALUE,
  STATUS_GROUPS,
  bucketOf,
  statusLabel,
} from './vocab';

describe('vocab maps', () => {
  it('derives buckets from statuses', () => {
    expect(bucketOf('completed')).toBe('closed');
    expect(bucketOf('active')).toBe('current');
    expect(bucketOf('wishlist')).toBe('open');
  });

  it('exposes human labels', () => {
    expect(statusLabel('done_with')).toBe('Done With');
    expect(statusLabel('not_started')).toBe('Not Started');
  });

  it('has a meta entry for every status', () => {
    for (const s of STATUSES) {
      expect(STATUS_BY_VALUE[s.value]).toBeDefined();
    }
  });

  it('groups statuses by the three buckets', () => {
    expect(STATUS_GROUPS).toHaveLength(BUCKETS.length);
    const total = STATUS_GROUPS.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBe(STATUSES.length);
  });
});
