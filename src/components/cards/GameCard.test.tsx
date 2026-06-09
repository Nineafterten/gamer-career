import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameCard } from './GameCard';
import { renderWithProviders, makeGame } from '../../test/utils';

describe('GameCard', () => {
  it('renders title, status, and both scores', () => {
    const game = makeGame({
      title: 'Celeste',
      status: 'completed',
      personalScore: 95,
      publicScore: 92,
      platforms: ['Switch'],
    });
    renderWithProviders(<GameCard game={game} onClick={() => {}} />);
    expect(screen.getByText('Celeste')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('9.5')).toBeInTheDocument();
    expect(screen.getByText('9.2')).toBeInTheDocument();
  });

  it('invokes onClick when activated', async () => {
    const onClick = vi.fn();
    renderWithProviders(<GameCard game={makeGame({ title: 'Celeste' })} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Celeste' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
