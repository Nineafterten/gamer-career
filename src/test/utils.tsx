import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../theme';
import { bucketOf } from '../data/vocab';
import type { GameEntry } from '../types/game';

export function renderWithProviders(ui: ReactNode, { route = '/' } = {}) {
  return render(
    <MantineProvider theme={theme}>
      <MemoryRouter
        initialEntries={[route]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {ui}
      </MemoryRouter>
    </MantineProvider>,
  );
}

let counter = 0;

/** Build a complete GameEntry for tests; pass overrides for the fields you care about. */
export function makeGame(overrides: Partial<GameEntry> = {}): GameEntry {
  counter += 1;
  const now = new Date('2025-01-01T00:00:00.000Z').toISOString();
  const status = overrides.status ?? 'not_started';
  return {
    id: `game-${counter}`,
    title: `Game ${counter}`,
    platforms: ['PC'],
    genres: ['Action'],
    likes: [],
    dislikes: [],
    favorite: false,
    statusHistory: [{ status, bucket: bucketOf(status), at: now }],
    createdAt: now,
    updatedAt: now,
    ...overrides,
    status,
  };
}

/** ISO timestamp N days before now (for aging assertions). */
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}
