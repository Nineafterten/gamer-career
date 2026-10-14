import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceGamepad2,
  IconDatabaseImport,
  IconListDetails,
  IconRestore,
} from '@tabler/icons-react';

import { loadSampleLibrary } from '../../lib/sampleLibrary';

/** First-run panel shown while the library has no records. */
export function EmptyLibrary() {
  const [loading, setLoading] = useState(false);

  async function handleLoadSample() {
    setLoading(true);
    try {
      const count = await loadSampleLibrary();
      notifications.show({
        color: 'teal',
        message: `Loaded ${count} sample games. Clear them any time in Settings → Danger zone.`,
      });
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
      setLoading(false);
    }
  }

  return (
    <Card withBorder radius="md" padding="xl">
      <Stack gap="md" align="flex-start">
        <ThemeIcon size={48} radius="md" variant="light" color="violet">
          <IconDeviceGamepad2 size={28} />
        </ThemeIcon>
        <div>
          <Title order={3}>Your library is empty</Title>
          <Text c="dimmed" maw={560}>
            Add games one at a time, paste a list, or restore a backup. Want to look around
            first? Load a sample library: a real gaming career, from the NES to the Switch 2.
            Everything stays in this browser.
          </Text>
        </div>
        <Group gap="sm">
          <Button
            leftSection={<IconDatabaseImport size={16} />}
            loading={loading}
            onClick={handleLoadSample}
          >
            Load sample library
          </Button>
          <Button
            variant="light"
            leftSection={<IconListDetails size={16} />}
            component={Link}
            to="/bulk"
          >
            Bulk Add
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconRestore size={16} />}
            component={Link}
            to="/settings"
          >
            Restore a backup
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
