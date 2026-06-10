import { Badge, Card, Checkbox, Group, Image, Text, Box } from '@mantine/core';
import { IconHeartFilled, IconDeviceGamepad } from '@tabler/icons-react';
import { toDisplayScore } from '../../lib/stats';
import type { GameEntry } from '../../types/game';
import { StatusBadge } from '../common/StatusBadge';
import styles from './GameCard.module.css';

export function GameCard({
  game,
  onClick,
  selectable = false,
  selected = false,
}: {
  game: GameEntry;
  onClick: () => void;
  selectable?: boolean;
  selected?: boolean;
}) {
  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={game.title}
      aria-pressed={selectable ? selected : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`interactive-card ${styles.card}${selected ? ` ${styles.selected}` : ''}`}
    >
      <Card.Section>
        {game.coverImageUrl ? (
          <Image src={game.coverImageUrl} h={120} alt={game.title} />
        ) : (
          <Box h={120} className={styles.placeholder}>
            <IconDeviceGamepad size={40} opacity={0.8} />
          </Box>
        )}
      </Card.Section>
      {/* Absolutely positioned, so it overlays the cover regardless of DOM order —
          and keeping it AFTER Card.Section preserves the section's edge bleed. */}
      {selectable && (
        <Checkbox
          checked={selected}
          readOnly
          tabIndex={-1}
          aria-hidden
          className={styles.checkbox}
        />
      )}

      <Group justify="space-between" mt="sm" gap="xs" wrap="nowrap">
        <Text fw={600} lineClamp={1} title={game.title}>
          {game.title}
        </Text>
        {game.favorite && <IconHeartFilled size={16} color="var(--mantine-color-pink-5)" />}
      </Group>

      <Group gap={6} mt={6}>
        <StatusBadge status={game.status} />
        {game.variantOfId && (
          <Badge color="grape" variant="light" size="sm">
            Variant
          </Badge>
        )}
        {game.platforms.slice(0, 2).map((p) => (
          <Badge key={p} variant="outline" color="gray" size="sm">
            {p}
          </Badge>
        ))}
        {game.platforms.length > 2 && (
          <Badge variant="outline" color="gray" size="sm">
            +{game.platforms.length - 2}
          </Badge>
        )}
      </Group>

      <Group justify="space-between" mt="sm">
        <ScorePill label="Mine" value={toDisplayScore(game.personalScore)} />
        <ScorePill label="Public" value={toDisplayScore(game.publicScore)} />
      </Group>
    </Card>
  );
}

function ScorePill({ label, value }: { label: string; value: string }) {
  return (
    <Group gap={4}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700}>
        {value}
      </Text>
    </Group>
  );
}
