import { Group, MultiSelect, Select, Switch, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { STATUS_GROUPS } from '../../data/vocab';

export type SortKey =
  | 'title'
  | 'releaseDate'
  | 'personalScore'
  | 'publicScore'
  | 'updatedAt'
  | 'favoriteRank';

export interface Filters {
  search: string;
  statuses: string[];
  platforms: string[];
  genres: string[];
  favoritesOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  search: '',
  statuses: [],
  platforms: [],
  genres: [],
  favoritesOnly: false,
  sort: 'releaseDate',
};

const SORT_OPTIONS = [
  { value: 'releaseDate', label: 'Release date' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'personalScore', label: 'My score' },
  { value: 'publicScore', label: 'Public score' },
  { value: 'updatedAt', label: 'Recently updated' },
  { value: 'favoriteRank', label: 'Favorite rank' },
];

export function FilterBar({
  filters,
  onChange,
  platformOptions,
  genreOptions,
  showStatusFilter = true,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  platformOptions: string[];
  genreOptions: string[];
  showStatusFilter?: boolean;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <Group gap="sm" align="flex-end">
      <TextInput
        label="Search"
        placeholder="Title, publisher, series…"
        leftSection={<IconSearch size={16} />}
        value={filters.search}
        onChange={(e) => set({ search: e.currentTarget.value })}
        w={220}
      />
      {showStatusFilter && (
        <MultiSelect
          label="Status"
          data={STATUS_GROUPS}
          value={filters.statuses}
          onChange={(v) => set({ statuses: v })}
          placeholder="Any"
          clearable
          w={200}
        />
      )}
      <MultiSelect
        label="Platform"
        data={platformOptions}
        value={filters.platforms}
        onChange={(v) => set({ platforms: v })}
        placeholder="Any"
        clearable
        searchable
        w={180}
      />
      <MultiSelect
        label="Genre"
        data={genreOptions}
        value={filters.genres}
        onChange={(v) => set({ genres: v })}
        placeholder="Any"
        clearable
        searchable
        w={180}
      />
      <Select
        label="Sort by"
        data={SORT_OPTIONS}
        value={filters.sort}
        onChange={(v) => set({ sort: (v as SortKey) ?? 'releaseDate' })}
        allowDeselect={false}
        w={170}
      />
      <Switch
        label="Favorites"
        checked={filters.favoritesOnly}
        onChange={(e) => set({ favoritesOnly: e.currentTarget.checked })}
        mb={8}
      />
    </Group>
  );
}
