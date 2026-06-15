import { useMemo, useState } from 'react';
import { Center, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import {
  needsAbandonReason,
  needsArt,
  needsScore,
  type ChartKind,
} from '../../data/presets';
import { STATUSES, statusLabel } from '../../data/vocab';
import { scoreHistogram } from '../../lib/stats';
import type { GameEntry, PlayStatus } from '../../types/game';
import styles from './HeroChart.module.css';

const HEIGHT = 280;

const C = {
  violet: '#7048e8',
  grape: '#ae3ec9',
  teal: '#12b886',
  green: '#40c057',
  yellow: '#f59f00',
  red: '#fa5252',
  blue: '#4263eb',
  cyan: '#22b8cf',
  gray: '#868e96',
  pink: '#e64980',
  indigo: '#5c7cfa',
};

/** Maps a status's Mantine color name (from vocab) to the chart's hex palette. */
const STATUS_HEX: Record<string, string> = C;

const axisTick = { fill: 'var(--mantine-color-dimmed)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--mantine-color-body)',
  border: '1px solid var(--mantine-color-default-border)',
  borderRadius: 8,
  color: 'var(--mantine-color-text)',
  fontSize: 12,
};
// Recharts colors tooltip item/label text on its own — force theme text color.
const tooltipItemStyle = { color: 'var(--mantine-color-text)' };
const tooltipLabelStyle = { color: 'var(--mantine-color-text)' };
const legendStyle = { fontSize: 12, color: 'var(--mantine-color-text)' };

/** Themed tooltip for the timeline scatter (also avoids Recharts' duplicate rows). */
function TimelineTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{p.title}</div>
      <div className={styles.tooltipSub}>
        {statusLabel(p.status)} · {p.year} · score {p.y}
      </div>
    </div>
  );
}

/** Themed tooltip for the my-vs-public rating scatter. */
function RatingTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{p.title}</div>
      <div className={styles.tooltipSub}>
        Mine {p.y.toFixed(1)} · Public {p.x.toFixed(1)}
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <Center h={HEIGHT}>
      <Text c="dimmed">{message}</Text>
    </Center>
  );
}

function truncate(s = '', n = 22) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/* ----------------------------- Timeline ----------------------------- */
interface TimelinePoint {
  x: number;
  y: number;
  title: string;
  year: string;
  status: PlayStatus;
}

function TimelineChart({ games }: { games: GameEntry[] }) {
  // Group points by status so each status gets its own colored Scatter (and a
  // legend entry) — far easier to read than one color per bucket when hundreds
  // of dots pile up around the most common scores.
  const groups = useMemo(() => {
    const byStatus = new Map<PlayStatus, TimelinePoint[]>();
    for (const g of games) {
      if (!g.releaseDate) continue;
      const point: TimelinePoint = {
        x: new Date(g.releaseDate).getTime(),
        y: typeof g.publicScore === 'number' ? g.publicScore : 50,
        title: g.title,
        year: g.releaseDate.slice(0, 4),
        status: g.status,
      };
      const existing = byStatus.get(g.status);
      if (existing) existing.push(point);
      else byStatus.set(g.status, [point]);
    }
    // Emit in the canonical status order so the legend reads predictably.
    return STATUSES.filter((s) => byStatus.has(s.value)).map((s) => ({
      status: s.value,
      label: s.label,
      color: STATUS_HEX[s.color] ?? C.gray,
      data: byStatus.get(s.value)!,
    }));
  }, [games]);

  const total = groups.reduce((n, g) => n + g.data.length, 0);
  if (!total) return <Empty message="No games with a release date to plot yet." />;

  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="var(--mantine-color-default-border)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          domain={['dataMin', 'dataMax']}
          tick={axisTick}
          tickFormatter={(v) => new Date(v).getFullYear().toString()}
          name="Year"
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, 100]}
          tick={axisTick}
          name="Public score"
          label={{ value: 'Public score', angle: -90, position: 'insideLeft', fill: 'var(--mantine-color-dimmed)', fontSize: 12 }}
        />
        {/* Smaller symbol area (was 80 ≈ 10px) so dense clusters stay readable. */}
        <ZAxis range={[55, 55]} />
        <Tooltip content={<TimelineTip />} />
        <Legend wrapperStyle={legendStyle} iconSize={9} />
        {groups.map((g) => (
          <Scatter
            key={g.status}
            name={g.label}
            data={g.data}
            fill={g.color}
            fillOpacity={0.8}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/* --------------------- Platform / Genre breakdown ------------------- */
// Replaces the old time-aging bars: for a manually/retroactively curated
// library, "days in status" only reflects when a record was last touched, so a
// composition breakdown (what's in this status, by platform or genre) is the
// meaningful, time-independent view.
function countBy(games: GameEntry[], dim: 'platform' | 'genre') {
  const counts = new Map<string, number>();
  for (const g of games) {
    const values = dim === 'platform' ? g.platforms : g.genres;
    const keys = values.length ? values : ['Unspecified'];
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 14);
}

function BreakdownChart({ games, color }: { games: GameEntry[]; color: string }) {
  const [dim, setDim] = useState<'platform' | 'genre'>('platform');
  const data = useMemo(() => countBy(games, dim), [games, dim]);

  return (
    <Stack gap="xs">
      <Group justify="flex-end">
        <SegmentedControl
          size="xs"
          value={dim}
          onChange={(v) => setDim(v as 'platform' | 'genre')}
          data={[
            { value: 'platform', label: 'Platform' },
            { value: 'genre', label: 'Genre' },
          ]}
        />
      </Group>
      {data.length ? (
        <ResponsiveContainer width="100%" height={HEIGHT - 44}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 24, bottom: 5, left: 10 }}
          >
            <CartesianGrid stroke="var(--mantine-color-default-border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={axisTick} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={axisTick}
              interval={0}
              tickFormatter={(v: string) => truncate(v)}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => [`${v}`, 'Games']}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty message="No games to break down here yet." />
      )}
    </Stack>
  );
}

/* --------------------------- Rating compare ------------------------- */
// Scatter of my score vs. the public score. The dashed diagonal is parity:
// dots above it = I rate higher than critics, below = lower. Scales to 100s.
function RatingCompareChart({ games }: { games: GameEntry[] }) {
  const data = useMemo(
    () =>
      games
        .filter(
          (g) =>
            typeof g.personalScore === 'number' && typeof g.publicScore === 'number',
        )
        .map((g) => ({
          x: (g.publicScore as number) / 10,
          y: (g.personalScore as number) / 10,
          title: g.title,
        })),
    [games],
  );

  if (!data.length)
    return (
      <Empty message="Score some finished games (and fetch their public score) to compare." />
    );

  return (
    <ResponsiveContainer width="100%" height={HEIGHT - 44}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 24, left: 0 }}>
        <CartesianGrid stroke="var(--mantine-color-default-border)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 10]}
          tick={axisTick}
          name="Public"
          label={{
            value: 'Public score',
            position: 'insideBottom',
            offset: -12,
            fill: 'var(--mantine-color-dimmed)',
            fontSize: 12,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, 10]}
          tick={axisTick}
          name="Mine"
          label={{
            value: 'My score',
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--mantine-color-dimmed)',
            fontSize: 12,
          }}
        />
        <ZAxis range={[55, 55]} />
        <ReferenceLine
          segment={[
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ]}
          stroke="var(--mantine-color-dimmed)"
          strokeDasharray="4 4"
        />
        <Tooltip content={<RatingTip />} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill={C.violet} fillOpacity={0.75} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** Distribution of scores (mine vs public) across ten 1-point buckets. */
function HistogramChart({ games }: { games: GameEntry[] }) {
  const data = useMemo(() => scoreHistogram(games), [games]);
  const hasData = data.some((b) => b.mine || b.public);

  if (!hasData)
    return <Empty message="Score some finished games to see the distribution." />;

  return (
    <ResponsiveContainer width="100%" height={HEIGHT - 44}>
      <BarChart data={data} margin={{ top: 10, right: 16, bottom: 5, left: 0 }}>
        <CartesianGrid stroke="var(--mantine-color-default-border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={axisTick} />
        <YAxis tick={axisTick} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
        />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="mine" name="My score" fill={C.violet} radius={[3, 3, 0, 0]} />
        <Bar dataKey="public" name="Public" fill={C.gray} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Wraps the rating views with a Compare (scatter) / Distribution (histogram) toggle. */
function RatingView({ games }: { games: GameEntry[] }) {
  const [mode, setMode] = useState<'compare' | 'distribution'>('compare');
  return (
    <Stack gap="xs">
      <Group justify="flex-end">
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={(v) => setMode(v as 'compare' | 'distribution')}
          data={[
            { value: 'compare', label: 'Compare' },
            { value: 'distribution', label: 'Distribution' },
          ]}
        />
      </Group>
      {mode === 'compare' ? (
        <RatingCompareChart games={games} />
      ) : (
        <HistogramChart games={games} />
      )}
    </Stack>
  );
}

/* --------------------------- Needs review --------------------------- */
// `games` are the records matching the needs_review preset (any hygiene reason).
// The callout breaks them down per reason; a record can count under more than one.
function ReviewChart({ games }: { games: GameEntry[] }) {
  const noScore = games.filter(needsScore).length;
  const noArt = games.filter(needsArt).length;
  const noReason = games.filter(needsAbandonReason).length;

  if (!games.length)
    return <Empty message="All caught up — nothing needs a score, cover art, or a reason." />;

  return (
    <Center h={HEIGHT}>
      <Group gap={56}>
        <ReviewStat value={noScore} label="No score" />
        <ReviewStat value={noArt} label="No cover art" />
        <ReviewStat value={noReason} label="No abandon reason" />
      </Group>
    </Center>
  );
}

function ReviewStat({ value, label }: { value: number; label: string }) {
  return (
    <Stack gap={0} align="center">
      <Text fw={700} fz={44} lh={1}>
        {value}
      </Text>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

/* --------------------------- Abandoned ------------------------------ */
function AbandonedChart({ games }: { games: GameEntry[] }) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of games) {
      for (const d of g.dislikes) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [games]);

  if (!games.length) return <Empty message="Nothing abandoned — keep it up!" />;

  return (
    <div>
      <Group justify="center" mb="xs" gap="xl">
        <Text size="sm" c="dimmed">
          {games.length} abandoned
        </Text>
      </Group>
      {data.length ? (
        <ResponsiveContainer width="100%" height={HEIGHT - 40}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 24, bottom: 5, left: 10 }}
          >
            <CartesianGrid stroke="var(--mantine-color-default-border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={axisTick} allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={130} tick={axisTick} interval={0} />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => [`${v}`, 'Games']}
            />
            <Bar dataKey="count" fill={C.red} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Empty message="Add dislikes to abandoned games to see what drove you away." />
      )}
    </div>
  );
}

/* ----------------------------- Genre cluster ------------------------ */
interface TreeNode {
  name: string;
  size: number;
}

function GenreClusterChart({ games }: { games: GameEntry[] }) {
  const data = useMemo<TreeNode[]>(() => {
    const counts = new Map<string, number>();
    for (const g of games) {
      const keys = g.genres.length ? g.genres : ['Unspecified'];
      for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size);
  }, [games]);

  if (!data.length) return <Empty message="Flag some favorites to see your genre map." />;

  const palette = Object.values(C);

  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <Treemap
        data={data}
        dataKey="size"
        nameKey="name"
        stroke="var(--mantine-color-body)"
        content={<TreemapCell palette={palette} />}
      >
        <Tooltip
          contentStyle={tooltipStyle}
          itemStyle={tooltipItemStyle}
          labelStyle={tooltipLabelStyle}
          formatter={(v) => [`${v} games`, 'Count']}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

function TreemapCell(props: any) {
  const { x, y, width, height, index, depth, name, palette, value } = props;
  if (width <= 0 || height <= 0) return null;
  const fill = palette[(index ?? 0) % palette.length];
  // Recharts calls this for the root node too (depth 0, no name) — only the
  // leaf nodes (depth 1) get a label.
  const showLabel = depth === 1 && Boolean(name) && width > 54 && height > 24;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--mantine-color-body)" />
      {showLabel && (
        <>
          <text
            x={x + 6}
            y={y + 18}
            fill="#fff"
            fontSize={12}
            fontWeight={700}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={2.5}
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            {truncate(name, Math.floor(width / 8))}
          </text>
          <text
            x={x + 6}
            y={y + 34}
            fill="#fff"
            fontSize={11}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={2.5}
            paintOrder="stroke"
            strokeLinejoin="round"
          >
            {value}
          </text>
        </>
      )}
    </g>
  );
}

/* ------------------------------ Dispatcher -------------------------- */
export function HeroChart({ kind, games }: { kind: ChartKind; games: GameEntry[] }) {
  switch (kind) {
    case 'timeline':
      return <TimelineChart games={games} />;
    case 'backlog':
      return <BreakdownChart games={games} color={C.indigo} />;
    case 'inplay':
      return <BreakdownChart games={games} color={C.teal} />;
    case 'rating':
      return <RatingView games={games} />;
    case 'review':
      return <ReviewChart games={games} />;
    case 'abandoned':
      return <AbandonedChart games={games} />;
    case 'genre':
      return <GenreClusterChart games={games} />;
    case 'wishlist':
      return <BreakdownChart games={games} color={C.cyan} />;
    default:
      return <Empty message="No visualization for this view." />;
  }
}
