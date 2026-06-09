import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { FilterBar, DEFAULT_FILTERS } from './FilterBar';
import { renderWithProviders } from '../../test/utils';

describe('FilterBar', () => {
  it('renders the core controls', () => {
    renderWithProviders(
      <FilterBar
        filters={DEFAULT_FILTERS}
        onChange={() => {}}
        platformOptions={['PC']}
        genreOptions={['RPG']}
      />,
    );
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Sort by')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
  });
});
