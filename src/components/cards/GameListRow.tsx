import { Badge, Group, Image, Paper, Text } from '@mantine/core';
import { IconDeviceGamepad, IconHeartFilled } from '@tabler/icons-react';
import { toDisplayScore } from '../../lib/stats';
import type { GameEntry } from '../../types/game';
import { StatusBadge } from '../common/StatusBadge';
import styles from './GameListRow.module.css';

export function GameListRow({ game, onClick }: { game: GameEntry; onClick: () => void }) {
  return (
    <Paper
      withBorder
      radius="md"
      p="sm"
      role="button"
      tabIndex={0}
      aria-label={game.title}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="interactive-card"
    >
      <Group wrap="nowrap" gap="md">
        <div className={styles.thumb}>
          {game.coverImageUrl ? (
            <Image src={game.coverImageUrl} w={44} h={44} alt={game.title} />
          ) : (
            <IconDeviceGamepad size={22} opacity={0.85} />
          )}
        </div>

        <div className={styles.grow}>
          <Group gap={6} wrap="nowrap">
            <Text fw={600} lineClamp={1}>
              {game.title}
            </Text>
            {game.favorite && (
              <IconHeartFilled size={14} color="var(--mantine-color-pink-5)" />
            )}
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {[game.series, game.platforms.join(', ')].filter(Boolean).join(' · ') || '—'}
          </Text>
        </div>

        <StatusBadge status={game.status} />
        {game.variantOfId && (
          <Badge color="grape" variant="light" size="sm" visibleFrom="sm">
            Variant
          </Badge>
        )}

        <Group gap="lg" wrap="nowrap" visibleFrom="sm">
          <ScoreCell label="Mine" value={toDisplayScore(game.personalScore)} />
          <ScoreCell label="Public" value={toDisplayScore(game.publicScore)} />
        </Group>
      </Group>
    </Paper>
  );
}

function ScoreCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.scoreCell}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700}>
        {value}
      </Text>
    </div>
  );
}
