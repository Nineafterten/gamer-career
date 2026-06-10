import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import {
  IconLayoutGrid,
  IconLayoutList,
  IconMoodEmpty,
  IconPlus,
} from '@tabler/icons-react';

import { useGames } from '../db/hooks';
import { getPreset } from '../data/presets';
import {
  DEFAULT_FILTERS,
  FilterBar,
  type Filters,
  type SortKey,
} from '../components/filters/FilterBar';
import { GameCard } from '../components/cards/GameCard';
import { GameListRow } from '../components/cards/GameListRow';
import { HeroChart } from '../components/charts/HeroChart';
import { useGameModal } from '../components/modal/useGameModal';
import type { GameEntry } from '../types/game';

type GroupBy = 'none' | 'series' | 'genre' | 'collection' | 'original';

const GROUP_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'series', label: 'Group by series' },
  { value: 'genre', label: 'Group by genre' },
  { value: 'collection', label: 'Group by collection' },
  { value: 'original', label: 'Group by original' },
];

function initialFilters(presetKey: string | null): Filters {
  const sort: SortKey = presetKey === 'favorites' ? 'favoriteRank' : 'releaseDate';
  return { ...DEFAULT_FILTERS, sort };
}

function compareBySort(a: GameEntry, b: GameEntry, sort: SortKey): number {
  switch (sort) {
    case 'title':
      return a.title.localeCompare(b.title);
    case 'releaseDate':
      return (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '');
    case 'personalScore':
      return (b.personalScore ?? -1) - (a.personalScore ?? -1);
    case 'publicScore':
      return (b.publicScore ?? -1) - (a.publicScore ?? -1);
    case 'updatedAt':
      return b.updatedAt.localeCompare(a.updatedAt);
    case 'favoriteRank':
      // Ranked games first (1 = top); unranked sink to the bottom.
      return (a.favoriteRank ?? Infinity) - (b.favoriteRank ?? Infinity);
    default:
      return 0;
  }
}

function matchesSearch(g: GameEntry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [g.title, g.publisher, g.series, ...g.genres, ...g.platforms]
    .filter(Boolean)
    .some((field) => (field as string).toLowerCase().includes(needle));
}

interface GameGroup {
  key: string;
  label: string;
  games: GameEntry[];
}

const CATCH_ALL = new Set(['No series', 'Unspecified', 'Standalone']);

function groupGames(
  list: GameEntry[],
  groupBy: GroupBy,
  allGames: GameEntry[],
): GameGroup[] {
  if (groupBy === 'none') return [{ key: 'all', label: '', games: list }];

  const titleById = new Map(allGames.map((g) => [g.id, g.title]));
  // Canonical records that have at least one variant pointing at them.
  const canonicalsWithVariants = new Set(
    allGames.filter((g) => g.variantOfId).map((g) => g.variantOfId),
  );
  const keyOf = (g: GameEntry): { key: string; label: string } => {
    if (groupBy === 'series') {
      const s = g.series || 'No series';
      return { key: s, label: s };
    }
    if (groupBy === 'genre') {
      const s = g.genres[0] || 'Unspecified';
      return { key: s, label: s };
    }
    if (groupBy === 'original') {
      // Variants cluster under their canonical; a canonical with variants is its
      // own group; everything else lumps into Standalone.
      if (g.variantOfId)
        return { key: g.variantOfId, label: titleById.get(g.variantOfId) ?? 'Original' };
      if (canonicalsWithVariants.has(g.id)) return { key: g.id, label: g.title };
      return { key: '__standalone', label: 'Standalone' };
    }
    // collection
    if (g.isCollection) return { key: g.id, label: g.title };
    if (g.collectionId)
      return { key: g.collectionId, label: titleById.get(g.collectionId) ?? 'Collection' };
    return { key: '__standalone', label: 'Standalone' };
  };

  const map = new Map<string, GameGroup>();
  for (const g of list) {
    const { key, label } = keyOf(g);
    const grp = map.get(key) ?? { key, label, games: [] };
    grp.games.push(g);
    map.set(key, grp);
  }

  return [...map.values()].sort((a, b) => {
    const aLast = CATCH_ALL.has(a.label);
    const bLast = CATCH_ALL.has(b.label);
    if (aLast !== bLast) return aLast ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
}

export function GamesView() {
  const [params] = useSearchParams();
  const presetKey = params.get('preset');
  const groupParam = params.get('group');
  const preset = getPreset(presetKey);
  const games = useGames();
  const modal = useGameModal();

  const [filters, setFilters] = useState<Filters>(() => initialFilters(presetKey));
  // View mode persists across navigation; grouping deliberately does not.
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>({
    key: 'gc-view-mode',
    defaultValue: 'grid',
  });
  const [groupBy, setGroupBy] = useState<GroupBy>((groupParam as GroupBy) || 'none');

  // Reset filters when the preset changes (e.g. navigating via a KPI).
  useEffect(() => {
    setFilters(initialFilters(presetKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.key]);

  // Grouping follows the URL: a ?group= deep-link (Series KPI) sets it, and any
  // other KPI/preset navigation resets it to "none". Manual changes are transient.
  useEffect(() => {
    setGroupBy((groupParam as GroupBy) || 'none');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupParam, presetKey]);

  const candidates = useMemo(
    () => (games ?? []).filter(preset.match),
    [games, preset],
  );

  const platformOptions = useMemo(
    () => Array.from(new Set(candidates.flatMap((g) => g.platforms))).sort(),
    [candidates],
  );
  const genreOptions = useMemo(
    () => Array.from(new Set(candidates.flatMap((g) => g.genres))).sort(),
    [candidates],
  );

  const visible = useMemo(() => {
    const filtered = candidates.filter((g) => {
      if (!matchesSearch(g, filters.search)) return false;
      if (filters.statuses.length && !filters.statuses.includes(g.status)) return false;
      if (filters.favoritesOnly && !g.favorite) return false;
      if (filters.platforms.length && !filters.platforms.some((p) => g.platforms.includes(p)))
        return false;
      if (filters.genres.length && !filters.genres.some((gn) => g.genres.includes(gn)))
        return false;
      return true;
    });
    return filtered.sort((a, b) => compareBySort(a, b, filters.sort));
  }, [candidates, filters]);

  const groups = useMemo(
    () => groupGames(visible, groupBy, games ?? []),
    [visible, groupBy, games],
  );

  if (!games) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  const renderGame = (g: GameEntry) =>
    viewMode === 'grid' ? (
      <GameCard key={g.id} game={g} onClick={() => modal.openView(g.id)} />
    ) : (
      <GameListRow key={g.id} game={g} onClick={() => modal.openView(g.id)} />
    );

  return (
    <Stack>
      <div>
        <Title order={2}>{preset.label}</Title>
        <Text c="dimmed">{preset.description}</Text>
      </div>

      <Card
        withBorder
        radius="md"
        padding="md"
        role="img"
        aria-label={`${preset.label} visualization`}
      >
        <HeroChart kind={preset.chart} games={candidates} />
      </Card>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        platformOptions={platformOptions}
        genreOptions={genreOptions}
        showStatusFilter={presetKey === null || presetKey === 'all'}
      />

      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          {visible.length} of {candidates.length} games
        </Text>
        <Group gap="sm">
          <Select
            size="xs"
            w={180}
            data={GROUP_OPTIONS}
            value={groupBy}
            onChange={(v) => setGroupBy((v as GroupBy) ?? 'none')}
            allowDeselect={false}
            aria-label="Group by"
          />
          <SegmentedControl
            size="xs"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'grid' | 'list')}
            aria-label="Card or list view"
            data={[
              {
                value: 'grid',
                label: (
                  <>
                    <IconLayoutGrid size={16} />
                    <VisuallyHidden>Grid view</VisuallyHidden>
                  </>
                ),
              },
              {
                value: 'list',
                label: (
                  <>
                    <IconLayoutList size={16} />
                    <VisuallyHidden>List view</VisuallyHidden>
                  </>
                ),
              },
            ]}
          />
        </Group>
      </Group>

      {visible.length === 0 ? (
        <Center h={200}>
          <Stack align="center" gap="xs">
            <IconMoodEmpty size={40} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed">No games match here yet.</Text>
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={modal.openCreate}
            >
              Add a game
            </Button>
          </Stack>
        </Center>
      ) : (
        <Stack gap="lg">
          {groups.map((group) => (
            <Stack key={group.key} gap="sm">
              {groupBy !== 'none' && (
                <Group gap="xs">
                  <Title order={4}>{group.label}</Title>
                  <Badge variant="light" color="gray">
                    {group.games.length}
                  </Badge>
                  {groupBy === 'original' && group.games.some((g) => g.variantOfId) && (
                    <Badge variant="light" color="grape">
                      +{group.games.filter((g) => g.variantOfId).length} repeats
                    </Badge>
                  )}
                </Group>
              )}
              {viewMode === 'grid' ? (
                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
                  {group.games.map(renderGame)}
                </SimpleGrid>
              ) : (
                <Stack gap="xs">{group.games.map(renderGame)}</Stack>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
