import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconMoodSad,
  IconPencil,
  IconPlus,
  IconThumbUp,
  IconTrash,
  IconX,
} from '@tabler/icons-react';

import { useGames, useSettings } from '../db/hooks';
import {
  addLabel,
  deleteLabel,
  renameLabel,
  resolveLabels,
  uniqStrings,
  type LabelKind,
} from '../lib/labels';
import type { AppSettings, GameEntry } from '../types/game';

interface LabelInfo {
  label: string;
  count: number;
}

/** The full set the manage view shows for a kind: managed list ∪ in-use, with counts. */
function buildLabels(
  settings: AppSettings,
  games: GameEntry[],
  kind: LabelKind,
): LabelInfo[] {
  const counts = new Map<string, number>();
  for (const g of games) {
    const tags = kind === 'like' ? g.likes : g.dislikes;
    for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return uniqStrings([...resolveLabels(settings, kind), ...counts.keys()])
    .map((label) => ({ label, count: counts.get(label) ?? 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function LabelRow({
  kind,
  info,
  allLabels,
}: {
  kind: LabelKind;
  info: LabelInfo;
  allLabels: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(info.label);
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setDraft(info.label);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft(info.label);
  }

  async function commit() {
    const next = draft.trim();
    if (!next || next === info.label) {
      cancelEdit();
      return;
    }
    const merging = allLabels.some(
      (l) => l !== info.label && l.toLowerCase() === next.toLowerCase(),
    );
    setBusy(true);
    try {
      const count = await renameLabel(kind, info.label, next, allLabels);
      const games = `${count} game${count === 1 ? '' : 's'}`;
      notifications.show({
        color: 'teal',
        message: merging
          ? `Merged “${info.label}” into “${next}” (${games}).`
          : `Renamed to “${next}” (${games} updated).`,
      });
      setEditing(false);
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    modals.openConfirmModal({
      title: `Delete “${info.label}”?`,
      centered: true,
      children: (
        <Text size="sm">
          {info.count > 0
            ? `This removes the label from ${info.count} game${
                info.count === 1 ? '' : 's'
              } and from the picker. It can't be undone (your latest export still has it).`
            : "This label isn't on any game — remove it from the picker?"}
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const count = await deleteLabel(kind, info.label, allLabels);
          notifications.show({
            color: 'red',
            message: `Deleted “${info.label}”${
              count ? ` from ${count} game${count === 1 ? '' : 's'}` : ''
            }.`,
          });
        } catch (err) {
          notifications.show({ color: 'red', message: (err as Error).message });
        }
      },
    });
  }

  if (editing) {
    return (
      <Group gap="xs" wrap="nowrap">
        <TextInput
          flex={1}
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void commit();
            }
            if (e.key === 'Escape') cancelEdit();
          }}
        />
        <ActionIcon
          variant="light"
          color="teal"
          size="lg"
          aria-label="Save label"
          loading={busy}
          onClick={() => void commit()}
        >
          <IconCheck size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label="Cancel rename"
          onClick={cancelEdit}
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Group gap="sm" wrap="nowrap" justify="space-between">
      <Group gap="xs" wrap="nowrap">
        <Text size="sm">{info.label}</Text>
        <Badge size="sm" variant="light" color="gray">
          {info.count}
        </Badge>
      </Group>
      <Group gap={4} wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Rename ${info.label}`}
          onClick={startEdit}
        >
          <IconPencil size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          aria-label={`Delete ${info.label}`}
          onClick={confirmDelete}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Group>
  );
}

function LabelSection({
  kind,
  title,
  icon,
  settings,
  games,
}: {
  kind: LabelKind;
  title: string;
  icon: React.ReactNode;
  settings: AppSettings;
  games: GameEntry[];
}) {
  const infos = useMemo(
    () => buildLabels(settings, games, kind),
    [settings, games, kind],
  );
  const allLabels = useMemo(() => infos.map((i) => i.label), [infos]);
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    if (allLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      notifications.show({ color: 'yellow', message: `“${trimmed}” already exists.` });
      return;
    }
    setBusy(true);
    try {
      await addLabel(kind, trimmed, allLabels);
      setNewLabel('');
      notifications.show({ color: 'teal', message: `Added “${trimmed}”.` });
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Group gap="xs" mb="md">
        {icon}
        <Title order={4}>{title}</Title>
        <Badge variant="light" color="gray">
          {infos.length}
        </Badge>
      </Group>

      <Group gap="xs" mb="md" wrap="nowrap">
        <TextInput
          flex={1}
          placeholder={`Add a ${kind} label`}
          value={newLabel}
          onChange={(e) => setNewLabel(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
        />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => void add()}
          loading={busy}
          disabled={!newLabel.trim()}
        >
          Add
        </Button>
      </Group>

      {infos.length ? (
        <Stack gap="sm">
          {infos.map((info) => (
            <LabelRow key={info.label} kind={kind} info={info} allLabels={allLabels} />
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No {kind} labels yet.
        </Text>
      )}
    </Card>
  );
}

export function ManageLabels() {
  const settings = useSettings();
  const games = useGames();

  if (!settings || !games) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg" maw={680}>
      <div>
        <Title order={2}>Likes &amp; Dislikes labels</Title>
        <Text c="dimmed">
          Rename or delete the tags you attach to games. A change is applied to every record
          that uses the label — the count shows how many that is.
        </Text>
      </div>

      <LabelSection
        kind="like"
        title="Likes"
        icon={<IconThumbUp size={20} />}
        settings={settings}
        games={games}
      />
      <LabelSection
        kind="dislike"
        title="Dislikes"
        icon={<IconMoodSad size={20} />}
        settings={settings}
        games={games}
      />
    </Stack>
  );
}
