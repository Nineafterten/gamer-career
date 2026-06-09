import { useState } from 'react';
import {
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Image,
  Loader,
  Modal,
  NumberInput,
  Rating,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconBrandWikipedia,
  IconDownload,
  IconExternalLink,
  IconTrash,
} from '@tabler/icons-react';

import { useGame, useGames, useSettings } from '../../db/hooks';
import { createGame, deleteGame, updateGame, type GameDraft } from '../../db/repository';
import { saveSettings } from '../../db/database';
import {
  COMMON_GENRES,
  COMMON_PLATFORMS,
  DEFAULT_DISLIKES,
  DEFAULT_LIKES,
  STATUS_BY_VALUE,
  STATUS_GROUPS,
} from '../../data/vocab';
import {
  getGameDetail,
  searchGames,
  toPublicFields,
  type RawgSearchResult,
} from '../../lib/rawg';
import { toDisplayScore } from '../../lib/stats';
import type { AppSettings, GameEntry } from '../../types/game';
import { StatusBadge } from '../common/StatusBadge';
import { useGameModal } from './useGameModal';
import styles from './GameModal.module.css';

interface FormValues {
  title: string;
  publisher: string;
  releaseDate: string;
  platforms: string[];
  publicScore: number | '';
  wikiUrl: string;
  genres: string[];
  series: string;
  coverImageUrl: string;
  status: GameEntry['status'];
  personalScore10: number; // 0-10 display scale (0 = unrated)
  likes: string[];
  dislikes: string[];
  noteworthy: string;
  favorite: boolean;
  favoriteRank: number | '';
  isCollection: boolean;
  collectionId: string | null;
  excludeFromStats: boolean;
  rawgId?: number;
}

function gameToValues(game?: GameEntry): FormValues {
  return {
    title: game?.title ?? '',
    publisher: game?.publisher ?? '',
    releaseDate: game?.releaseDate ?? '',
    platforms: game?.platforms ?? [],
    publicScore: game?.publicScore ?? '',
    wikiUrl: game?.wikiUrl ?? '',
    genres: game?.genres ?? [],
    series: game?.series ?? '',
    coverImageUrl: game?.coverImageUrl ?? '',
    status: game?.status ?? 'not_started',
    personalScore10:
      typeof game?.personalScore === 'number' ? game.personalScore / 10 : 0,
    likes: game?.likes ?? [],
    dislikes: game?.dislikes ?? [],
    noteworthy: game?.noteworthy ?? '',
    favorite: game?.favorite ?? false,
    favoriteRank: game?.favoriteRank ?? '',
    isCollection: game?.isCollection ?? false,
    collectionId: game?.collectionId ?? null,
    excludeFromStats: game?.excludeFromStats ?? false,
    rawgId: game?.rawgId,
  };
}

function valuesToDraft(v: FormValues): GameDraft {
  return {
    title: v.title.trim(),
    publisher: v.publisher.trim() || undefined,
    releaseDate: v.releaseDate || undefined,
    platforms: v.platforms,
    publicScore: v.publicScore === '' ? undefined : Number(v.publicScore),
    wikiUrl: v.wikiUrl.trim() || undefined,
    genres: v.genres,
    series: v.series.trim() || undefined,
    coverImageUrl: v.coverImageUrl.trim() || undefined,
    rawgId: v.rawgId,
    status: v.status,
    personalScore: v.personalScore10 > 0 ? Math.round(v.personalScore10 * 10) : undefined,
    likes: v.likes,
    dislikes: v.dislikes,
    noteworthy: v.noteworthy.trim() || undefined,
    favorite: v.favorite,
    favoriteRank:
      v.favorite && v.favoriteRank !== '' ? Number(v.favoriteRank) : undefined,
    isCollection: v.isCollection || undefined,
    // A collection can't also be a member of another collection.
    collectionId: v.isCollection ? undefined : (v.collectionId ?? undefined),
    excludeFromStats: v.excludeFromStats || undefined,
  };
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function persistNewVocab(
  settings: AppSettings,
  likes: string[],
  dislikes: string[],
) {
  const knownLikes = new Set([...DEFAULT_LIKES, ...settings.customLikes]);
  const knownDislikes = new Set([...DEFAULT_DISLIKES, ...settings.customDislikes]);
  const newLikes = likes.filter((l) => !knownLikes.has(l));
  const newDislikes = dislikes.filter((d) => !knownDislikes.has(d));
  if (newLikes.length || newDislikes.length) {
    await saveSettings({
      customLikes: uniq([...settings.customLikes, ...newLikes]),
      customDislikes: uniq([...settings.customDislikes, ...newDislikes]),
    });
  }
}

/** Read-only presentation for "view" mode. */
function GameView({
  game,
  onEdit,
  onDelete,
  onClose,
}: {
  game: GameEntry;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const allGames = useGames() ?? [];
  const parent = game.collectionId
    ? allGames.find((g) => g.id === game.collectionId)
    : undefined;
  return (
    <Stack>
      <Group align="flex-start" wrap="nowrap">
        {game.coverImageUrl ? (
          <Image
            src={game.coverImageUrl}
            w={140}
            radius="md"
            alt={game.title}
            fallbackSrc="https://placehold.co/140x180?text=No+Art"
          />
        ) : null}
        <Stack gap="xs" className={styles.grow}>
          <Group gap="xs">
            <StatusBadge status={game.status} />
            {game.favorite && (
              <Badge color="pink" variant="filled">
                ★ Favorite{game.favoriteRank ? ` #${game.favoriteRank}` : ''}
              </Badge>
            )}
            {game.isCollection && (
              <Badge color="blue" variant="filled">
                Collection
              </Badge>
            )}
            {game.excludeFromStats && (
              <Badge color="gray" variant="outline">
                Excluded from stats
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {STATUS_BY_VALUE[game.status].description}
          </Text>
          <Group gap="lg">
            <div>
              <Text size="xs" c="dimmed">
                My Score
              </Text>
              <Text fw={700} size="xl">
                {toDisplayScore(game.personalScore)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Public Score
              </Text>
              <Text fw={700} size="xl">
                {toDisplayScore(game.publicScore)}
              </Text>
            </div>
          </Group>
          <Group gap={6}>
            {game.platforms.map((p) => (
              <Badge key={p} variant="outline" color="gray">
                {p}
              </Badge>
            ))}
          </Group>
        </Stack>
      </Group>

      <SimpleGrid cols={2} spacing="xs">
        <Field label="Publisher" value={game.publisher} />
        <Field label="Released" value={game.releaseDate} />
        <Field label="Series" value={game.series} />
        <Field label="Genres" value={game.genres.join(', ')} />
        {parent && <Field label="Part of" value={parent.title} />}
      </SimpleGrid>

      {(game.likes.length > 0 || game.dislikes.length > 0) && (
        <SimpleGrid cols={2} spacing="xs">
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              Likes
            </Text>
            <Group gap={4}>
              {game.likes.length ? (
                game.likes.map((l) => (
                  <Badge key={l} color="teal" variant="light">
                    {l}
                  </Badge>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              )}
            </Group>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              Dislikes
            </Text>
            <Group gap={4}>
              {game.dislikes.length ? (
                game.dislikes.map((d) => (
                  <Badge key={d} color="red" variant="light">
                    {d}
                  </Badge>
                ))
              ) : (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              )}
            </Group>
          </div>
        </SimpleGrid>
      )}

      {game.noteworthy && (
        <div>
          <Text size="xs" c="dimmed" mb={4}>
            Noteworthy
          </Text>
          <Text size="sm">{game.noteworthy}</Text>
        </div>
      )}

      {game.wikiUrl && (
        <Anchor href={game.wikiUrl} target="_blank" size="sm">
          <Group gap={4}>
            <IconBrandWikipedia size={16} /> Reference wiki
            <IconExternalLink size={12} />
          </Group>
        </Anchor>
      )}

      <Divider />
      <Group justify="space-between">
        <Button
          variant="subtle"
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={onDelete}
        >
          Delete
        </Button>
        <Group gap="sm">
          <Button onClick={onEdit}>Edit</Button>
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value || '—'}</Text>
    </div>
  );
}

/** Editable form for "create" and "edit" modes. */
function GameForm({
  game,
  settings,
  onDone,
  onCancel,
}: {
  game?: GameEntry;
  settings: AppSettings;
  onDone: (id: string) => void;
  onCancel: () => void;
}) {
  const form = useForm<FormValues>({
    initialValues: gameToValues(game),
    validate: {
      title: (v) => (v.trim().length ? null : 'Title is required'),
    },
  });

  const [matches, setMatches] = useState<RawgSearchResult[]>([]);
  const [busy, setBusy] = useState(false);

  const allLikes = uniq([...DEFAULT_LIKES, ...settings.customLikes]);
  const allDislikes = uniq([...DEFAULT_DISLIKES, ...settings.customDislikes]);

  const allGames = useGames() ?? [];
  const collectionOptions = allGames
    .filter((g) => g.isCollection && g.id !== game?.id)
    .map((g) => ({ value: g.id, label: g.title }));

  async function runSearch() {
    if (!form.values.title.trim()) {
      notifications.show({ color: 'yellow', message: 'Enter a title first.' });
      return;
    }
    setBusy(true);
    try {
      const results = await searchGames(form.values.title, settings.rawgApiKey);
      setMatches(results);
      if (!results.length) {
        notifications.show({ message: 'No RAWG matches found.' });
      }
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function applyMatch(m: RawgSearchResult) {
    setBusy(true);
    try {
      const detail = await getGameDetail(m.id, settings.rawgApiKey);
      const patch = toPublicFields(detail);
      form.setValues({
        ...form.values,
        title: patch.title,
        publisher: patch.publisher ?? form.values.publisher,
        releaseDate: patch.releaseDate ?? form.values.releaseDate,
        platforms: patch.platforms.length ? patch.platforms : form.values.platforms,
        publicScore: patch.publicScore ?? form.values.publicScore,
        genres: patch.genres.length ? patch.genres : form.values.genres,
        coverImageUrl: patch.coverImageUrl ?? form.values.coverImageUrl,
        wikiUrl: patch.wikiUrl ?? form.values.wikiUrl,
        rawgId: patch.rawgId,
      });
      setMatches([]);
      notifications.show({ color: 'teal', message: `Filled details for “${patch.title}”.` });
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const handleSubmit = form.onSubmit(async (values) => {
    setBusy(true);
    try {
      const draft = valuesToDraft(values);
      let id: string;
      if (game) {
        await updateGame(game.id, draft);
        id = game.id;
      } else {
        const created = await createGame(draft);
        id = created.id;
      }
      await persistNewVocab(settings, values.likes, values.dislikes);
      notifications.show({ color: 'teal', message: `Saved “${draft.title}”.` });
      onDone(id);
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Divider label="Public info" labelPosition="left" />
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <TextInput
            label="Title"
            placeholder="Game title"
            withAsterisk
            className={styles.grow}
            {...form.getInputProps('title')}
          />
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={runSearch}
            loading={busy}
          >
            Fetch details
          </Button>
        </Group>

        {matches.length > 0 && (
          <Box p="xs" className={styles.matchesBox}>
            <Group justify="space-between" mb={6}>
              <Text size="sm" fw={600}>
                RAWG matches — pick one to autofill
              </Text>
              <Button size="compact-xs" variant="subtle" onClick={() => setMatches([])}>
                Cancel
              </Button>
            </Group>
            <Stack gap={4} className={styles.matchesList}>
              {matches.map((m) => (
                <Group
                  key={m.id}
                  gap="sm"
                  wrap="nowrap"
                  p={4}
                  className={styles.matchRow}
                  onClick={() => applyMatch(m)}
                >
                  {m.background_image && (
                    <Image src={m.background_image} w={48} h={32} radius="sm" />
                  )}
                  <div>
                    <Text size="sm">{m.name}</Text>
                    <Text size="xs" c="dimmed">
                      {m.released?.slice(0, 4) ?? 'Unknown year'}
                      {m.metacritic ? ` · Metacritic ${m.metacritic}` : ''}
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </Box>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Publisher" {...form.getInputProps('publisher')} />
          <TextInput
            label="Release date"
            type="date"
            {...form.getInputProps('releaseDate')}
          />
          <TextInput label="Series" {...form.getInputProps('series')} />
          <NumberInput
            label="Public score (0–100)"
            min={0}
            max={100}
            {...form.getInputProps('publicScore')}
          />
        </SimpleGrid>
        <TagsInput
          label="Platforms"
          data={COMMON_PLATFORMS}
          placeholder="Add a console/format"
          {...form.getInputProps('platforms')}
        />
        <TagsInput
          label="Genres"
          data={COMMON_GENRES}
          placeholder="Add a genre"
          {...form.getInputProps('genres')}
        />
        <TextInput
          label="Reference wiki URL"
          placeholder="https://en.wikipedia.org/..."
          {...form.getInputProps('wikiUrl')}
        />
        <TextInput
          label="Cover image URL"
          placeholder="https://..."
          {...form.getInputProps('coverImageUrl')}
        />
        {form.values.coverImageUrl && (
          <Image
            src={form.values.coverImageUrl}
            w={120}
            radius="md"
            fallbackSrc="https://placehold.co/120x160?text=Bad+URL"
          />
        )}

        <Divider label="Personal info" labelPosition="left" mt="sm" />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Play status"
            data={STATUS_GROUPS}
            allowDeselect={false}
            {...form.getInputProps('status')}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>
              My score
            </Text>
            <Group gap="sm">
              <Rating
                count={10}
                fractions={2}
                value={form.values.personalScore10}
                onChange={(v) => form.setFieldValue('personalScore10', v)}
              />
              <Text size="sm" c="dimmed">
                {form.values.personalScore10 > 0
                  ? form.values.personalScore10.toFixed(1)
                  : 'Unrated'}
              </Text>
            </Group>
          </div>
        </SimpleGrid>
        <TagsInput
          label="Likes"
          data={allLikes}
          placeholder="What you enjoyed"
          {...form.getInputProps('likes')}
        />
        <TagsInput
          label="Dislikes"
          data={allDislikes}
          placeholder="What didn't land"
          {...form.getInputProps('dislikes')}
        />
        <Textarea
          label="Noteworthy"
          autosize
          minRows={2}
          placeholder="Anything worth remembering about this one…"
          {...form.getInputProps('noteworthy')}
        />
        <Group>
          <Switch
            label="Favorite"
            checked={form.values.favorite}
            {...form.getInputProps('favorite', { type: 'checkbox' })}
          />
          {form.values.favorite && (
            <NumberInput
              label="Favorite rank"
              w={140}
              min={1}
              placeholder="e.g. 1"
              {...form.getInputProps('favoriteRank')}
            />
          )}
        </Group>

        <Divider label="Collection" labelPosition="left" mt="sm" />
        <Group>
          <Switch
            label="This entry is a collection"
            checked={form.values.isCollection}
            {...form.getInputProps('isCollection', { type: 'checkbox' })}
          />
          <Switch
            label="Exclude from stats"
            checked={form.values.excludeFromStats}
            {...form.getInputProps('excludeFromStats', { type: 'checkbox' })}
          />
        </Group>
        <Select
          label="Part of collection"
          placeholder="Standalone"
          description="Link this to a compilation/remaster it belongs to (e.g. The Ezio Collection)."
          data={collectionOptions}
          value={form.values.collectionId}
          onChange={(v) => form.setFieldValue('collectionId', v)}
          clearable
          searchable
          disabled={form.values.isCollection}
        />

        <Divider />
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {game ? 'Save changes' : 'Add game'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function GameModal() {
  const { gameId, mode, isOpen, close, openEdit, openView } = useGameModal();
  const game = useGame(gameId);
  const settings = useSettings();

  const isCreate = mode === 'create';
  const needsGame = mode === 'view' || mode === 'edit';
  const loading = needsGame && !game;

  function confirmDelete(target: GameEntry) {
    modals.openConfirmModal({
      title: 'Delete this game?',
      centered: true,
      children: (
        <Text size="sm">
          Permanently remove <b>{target.title}</b> from your library. This can't be
          undone (your latest export still has it).
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Keep it' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteGame(target.id);
        notifications.show({ color: 'red', message: `Deleted “${target.title}”.` });
        close();
      },
    });
  }

  const title = isCreate
    ? 'Add a game'
    : mode === 'edit'
      ? 'Edit game'
      : (game?.title ?? 'Game');

  return (
    <Modal
      opened={isOpen}
      onClose={close}
      size="lg"
      title={<Title order={4}>{title}</Title>}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      {loading || !settings ? (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      ) : mode === 'view' && game ? (
        <GameView
          game={game}
          onEdit={() => openEdit(game.id)}
          onDelete={() => confirmDelete(game)}
          onClose={close}
        />
      ) : (
        <GameForm
          game={mode === 'edit' ? game : undefined}
          settings={settings}
          onDone={(id) => openView(id)}
          onCancel={close}
        />
      )}
    </Modal>
  );
}
