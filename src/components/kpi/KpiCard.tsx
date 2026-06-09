import { Card, Group, Text, ThemeIcon } from '@mantine/core';
import { Link } from 'react-router-dom';

export function KpiCard({
  label,
  value,
  sub,
  icon,
  color = 'violet',
  to,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
  to: string;
}) {
  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      component={Link}
      to={to}
      className="interactive-card"
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Text fw={700} fz={28} lh={1.1} mt={4}>
            {value}
          </Text>
          {sub && (
            <Text size="xs" c="dimmed" mt={4}>
              {sub}
            </Text>
          )}
        </div>
        <ThemeIcon variant="light" color={color} size={42} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}
