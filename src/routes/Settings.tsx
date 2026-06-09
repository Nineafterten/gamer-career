import { useEffect, useState } from 'react';
import {
  Anchor,
  Button,
  Card,
  Code,
  Divider,
  FileButton,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import {
  IconBrandXbox,
  IconDownload,
  IconKey,
  IconPalette,
  IconRefresh,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';

import { useGames, useSettings } from '../db/hooks';
import { saveSettings } from '../db/database';
import { clearAllGames } from '../db/repository';
import { resetToSeed } from '../db/seed';
import { exportToFile, importFromFile } from '../lib/backup';
import { getTitleHistory, titleHistoryToRows } from '../lib/openxbl';
import styles from './Settings.module.css';

export function Settings() {
  const settings = useSettings();
  const games = useGames();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();

  const [keyDraft, setKeyDraft] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (settings) setKeyDraft(settings.rawgApiKey ?? '');
  }, [settings]);

  async function saveKey() {
    await saveSettings({ rawgApiKey: keyDraft.trim() || undefined });
    notifications.show({ color: 'teal', message: 'RAWG API key saved.' });
  }

  async function syncXbox() {
    setSyncing(true);
    try {
      const data = await getTitleHistory();
      const rows = titleHistoryToRows(data);
      if (!rows.length) {
        notifications.show({ color: 'yellow', message: 'No Xbox titles came back.' });
        return;
      }
      // Hand the titles to the Bulk Add staging flow (review + dedupe + create).
      const prefill = JSON.stringify(
        rows.map((r) => ({
          title: r.title,
          platform: r.platforms.join(';'),
          status: r.status,
        })),
      );
      sessionStorage.setItem('gc-bulk-prefill', prefill);
      notifications.show({
        color: 'teal',
        message: `Found ${rows.length} Xbox titles — review & add.`,
      });
      navigate('/bulk');
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleExport() {
    const count = await exportToFile();
    notifications.show({ color: 'teal', message: `Exported ${count} games to a JSON file.` });
  }

  async function handleImport(file: File | null) {
    if (!file) return;
    try {
      const result = await importFromFile(file, importMode);
      notifications.show({
        color: 'teal',
        message: `Imported ${result.games} games (${result.mode}).`,
      });
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    }
  }

  function confirmReset() {
    modals.openConfirmModal({
      title: 'Reset to the starter library?',
      centered: true,
      children: (
        <Text size="sm">
          This deletes all current games and restores the original 23 seeded titles.
          Export a backup first if you want to keep your edits.
        </Text>
      ),
      labels: { confirm: 'Reset', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await resetToSeed();
        notifications.show({ color: 'teal', message: 'Library reset to the starter set.' });
      },
    });
  }

  function confirmClear() {
    modals.openConfirmModal({
      title: 'Clear all games?',
      centered: true,
      children: (
        <Text size="sm">
          This permanently removes every game record. Make sure you have an export saved.
        </Text>
      ),
      labels: { confirm: 'Delete everything', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await clearAllGames();
        notifications.show({ color: 'red', message: 'All games cleared.' });
      },
    });
  }

  return (
    <Stack gap="lg" maw={680}>
      <Title order={2}>Settings</Title>

      <Card withBorder radius="md" padding="lg">
        <Group gap="xs" mb="sm">
          <IconKey size={20} />
          <Title order={4}>Metadata (RAWG)</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="sm">
          Add a free API key from{' '}
          <Anchor href="https://rawg.io/apidocs" target="_blank">
            rawg.io/apidocs
          </Anchor>{' '}
          to power the “Fetch details” button on game entries.
        </Text>
        <Group align="flex-end">
          <PasswordInput
            label="API key"
            placeholder="Your RAWG key"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.currentTarget.value)}
            className={styles.grow}
          />
          <Button onClick={saveKey}>Save key</Button>
        </Group>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group gap="xs" mb="sm">
          <IconBrandXbox size={20} />
          <Title order={4}>Xbox sync</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="sm">
          Pull your Xbox play history into Bulk Add to review and create. Runs through a small
          server proxy, so it works on the deployed site once
          <Code>OPENXBL_KEY</Code> is set (see DEPLOY.md) — not on the local dev server.
        </Text>
        <Button
          leftSection={<IconBrandXbox size={16} />}
          onClick={syncXbox}
          loading={syncing}
        >
          Sync from Xbox
        </Button>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group gap="xs" mb="sm">
          <IconPalette size={20} />
          <Title order={4}>Appearance</Title>
        </Group>
        <SegmentedControl
          value={colorScheme}
          onChange={(v) => {
            const scheme = v as 'light' | 'dark' | 'auto';
            setColorScheme(scheme);
            void saveSettings({ colorScheme: scheme });
          }}
          data={[
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'Auto', value: 'auto' },
          ]}
        />
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group gap="xs" mb="sm">
          <IconDownload size={20} />
          <Title order={4}>Backup &amp; restore</Title>
        </Group>
        <Text size="sm" c="dimmed" mb="sm">
          {games?.length ?? 0} games stored locally in your browser. Export regularly to
          keep a safe copy.
        </Text>
        <Group>
          <Button leftSection={<IconDownload size={16} />} onClick={handleExport}>
            Export backup (.json)
          </Button>
        </Group>
        <Divider my="md" />
        <Text size="sm" fw={500} mb={6}>
          Import a backup
        </Text>
        <Group align="center">
          <SegmentedControl
            value={importMode}
            onChange={(v) => setImportMode(v as 'replace' | 'merge')}
            data={[
              { label: 'Replace all', value: 'replace' },
              { label: 'Merge', value: 'merge' },
            ]}
          />
          <FileButton accept="application/json" onChange={handleImport}>
            {(props) => (
              <Button variant="light" leftSection={<IconUpload size={16} />} {...props}>
                Choose file…
              </Button>
            )}
          </FileButton>
        </Group>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group gap="xs" mb="sm">
          <IconTrash size={20} color="var(--mantine-color-red-6)" />
          <Title order={4}>Danger zone</Title>
        </Group>
        <Group>
          <Button
            variant="light"
            color="orange"
            leftSection={<IconRefresh size={16} />}
            onClick={confirmReset}
          >
            Reset to starter library
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={confirmClear}
          >
            Clear all games
          </Button>
        </Group>
      </Card>

      <Text size="xs" c="dimmed" ta="center">
        Gamer Career v{__APP_VERSION__} · built {__BUILD_DATE__}
      </Text>
    </Stack>
  );
}
