import { useMemo } from 'react';
import { Center, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconCircleCheck,
  IconClipboardList,
  IconClock,
  IconDeviceGamepad2,
  IconFingerprint,
  IconHeart,
  IconList,
  IconPercentage,
  IconPlayerPause,
  IconPlayerPlay,
  IconRepeat,
  IconScale,
  IconShoppingCart,
  IconSkull,
  IconSparkles,
  IconStack2,
  IconTrophy,
} from '@tabler/icons-react';

import { useGames } from '../db/hooks';
import { computeKpis, toDisplayScore } from '../lib/stats';
import { KpiCard } from '../components/kpi/KpiCard';

export function Dashboard() {
  const games = useGames();

  const kpis = useMemo(() => computeKpis(games ?? []), [games]);
  const seriesCount = useMemo(
    () =>
      new Set(
        (games ?? []).filter((g) => g.series && !g.hidden).map((g) => g.series),
      ).size,
    [games],
  );

  if (!games) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Your Gaming Career</Title>
        <Text c="dimmed">
          {kpis.total} games tracked · {kpis.closedPositive} finished ·{' '}
          {kpis.favorites} favorites
        </Text>
      </div>

      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
        <KpiCard
          label="Total Games"
          value={kpis.total}
          sub="Every record"
          icon={<IconList size={22} />}
          color="violet"
          to="/games"
        />
        <KpiCard
          label="Unique Games"
          value={kpis.unique}
          sub="Distinct, variants collapsed"
          icon={<IconFingerprint size={22} />}
          color="teal"
          to="/games?group=original"
        />
        <KpiCard
          label="In Play"
          value={kpis.inPlay}
          sub="Active · passive"
          icon={<IconPlayerPlay size={22} />}
          color="teal"
          to="/games?preset=in_play"
        />
        <KpiCard
          label="Paused"
          value={kpis.paused}
          sub="On hold"
          icon={<IconPlayerPause size={22} />}
          color="yellow"
          to="/games?preset=paused"
        />
        <KpiCard
          label="Backlog"
          value={kpis.backlog}
          sub="Waiting their turn"
          icon={<IconClock size={22} />}
          color="indigo"
          to="/games?preset=backlog"
        />
        <KpiCard
          label="Not Started"
          value={kpis.notStarted}
          sub="Ready to begin"
          icon={<IconSparkles size={22} />}
          color="gray"
          to="/games?preset=not_started"
        />
        <KpiCard
          label="Completed"
          value={kpis.completed}
          sub="Fully finished"
          icon={<IconTrophy size={22} />}
          color="grape"
          to="/games?preset=completed"
        />
        <KpiCard
          label="Done With"
          value={kpis.doneWith}
          sub="Finished enough"
          icon={<IconCircleCheck size={22} />}
          color="violet"
          to="/games?preset=done_with"
        />
        <KpiCard
          label="Needs Review"
          value={kpis.needsReview}
          sub="Missing score, art, or reason"
          icon={<IconClipboardList size={22} />}
          color="orange"
          to="/games?preset=needs_review"
        />
        <KpiCard
          label="Favorites"
          value={kpis.favorites}
          sub="Your top picks"
          icon={<IconHeart size={22} />}
          color="pink"
          to="/games?preset=favorites"
        />
        <KpiCard
          label="Wishlist"
          value={kpis.wishlist}
          sub="Want to buy"
          icon={<IconShoppingCart size={22} />}
          color="cyan"
          to="/games?preset=wishlist"
        />
        <KpiCard
          label="Series"
          value={seriesCount}
          sub="Distinct franchises"
          icon={<IconStack2 size={22} />}
          color="lime"
          to="/games?group=series"
        />
        <KpiCard
          label="Repeats"
          value={kpis.repeats}
          sub="Alternate versions / editions"
          icon={<IconRepeat size={22} />}
          color="grape"
          to="/games?group=original"
        />
        <KpiCard
          label="Abandoned"
          value={kpis.abandoned}
          sub="Walked away"
          icon={<IconSkull size={22} />}
          color="red"
          to="/games?preset=abandoned"
        />
        <KpiCard
          label="My vs Public"
          value={`${toDisplayScore(kpis.avgPersonal)} / ${toDisplayScore(kpis.avgPublic)}`}
          sub="Average score"
          icon={<IconScale size={22} />}
          color="blue"
          to="/games?preset=completed"
        />
        <KpiCard
          label="Completion Rate"
          value={`${Math.round(kpis.completionRate * 100)}%`}
          sub="Positively closed"
          icon={<IconPercentage size={22} />}
          color="green"
          to="/games?preset=completed"
        />
        <KpiCard
          label="Played This Year"
          value={kpis.playedThisYear}
          sub={`${new Date().getFullYear()} starts & finishes`}
          icon={<IconDeviceGamepad2 size={22} />}
          color="orange"
          to="/games"
        />
      </SimpleGrid>
    </Stack>
  );
}
