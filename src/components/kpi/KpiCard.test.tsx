import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';
import { renderWithProviders } from '../../test/utils';

describe('KpiCard', () => {
  it('renders the label/value and links to its target', () => {
    renderWithProviders(
      <KpiCard label="Total Games" value={23} icon={<span>icon</span>} to="/games" />,
    );
    expect(screen.getByText('Total Games')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/games');
  });
});
