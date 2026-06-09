import { Badge } from '@mantine/core';
import { STATUS_BY_VALUE } from '../../data/vocab';
import type { PlayStatus } from '../../types/game';

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: PlayStatus;
  size?: string;
}) {
  const meta = STATUS_BY_VALUE[status];
  return (
    <Badge color={meta.color} variant="light" size={size}>
      {meta.label}
    </Badge>
  );
}
