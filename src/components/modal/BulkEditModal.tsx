import { useEffect, useState } from 'react';
import {
  Button,
  Divider,
  Group,
  Modal,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

import { useGames, useSettings } from '../../db/hooks';
import { saveSettings } from '../../db/database';
import { applyBulkEdit } from '../../db/repository';
import {
  COMMON_GENRES,
  COMMON_PLATFORMS,
  DEFAULT_DISLIKES,
  DEFAULT_LIKES,
  STATUS_GROUPS,
} from '../../data/vocab';
import type { BulkEditSpec, TagEdit, TagMode } from '../../lib/bulkEdit';
import type { GameEntry, PlayStatus } from '../../types/game';

function uniq(values: string[]): string[] {
  return Array.from(new Set(values));
}

/** Enable switch + the field's input(s) below it (disabled until enabled). */
function FieldRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Switch label={label} checked={enabled} onChange={onToggle} mb={6} />
      {children}
    </div>
  );
}

/** Add / Remove / Replace control for a tag field. */
function TagField({
  data,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  data: string[];
  value: TagEdit;
  onChange: (next: TagEdit) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <Group align="flex-start" gap="xs" wrap="nowrap">
      <SegmentedControl
        size="xs"
        disabled={disabled}
        value={value.mode}
        onChange={(m) => onChange({ ...value, mode: m as TagMode })}
        data={[
          { value: 'add', label: 'Add' },
          { value: 'remove', label: 'Remove' },
          { value: 'replace', label: 'Replace' },
        ]}
      />
      <TagsInput
        flex={1}
        disabled={disabled}
        data={data}
        placeholder={placeholder}
        value={value.values}
        onChange={(values) => onChange({ ...value, values })}
      />
    </Group>
  );
}

const NO_TAGS: TagEdit = { mode: 'add', values: [] };

export function BulkEditModal({
  opened,
  onClose,
  ids,
  onApplied,
}: {
  opened: boolean;
  onClose: () => void;
  ids: string[];
  onApplied: () => void;
}) {
  const allGames = useGames() ?? [];
  const settings = useSettings();

  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const [series, setSeries] = useState('');
  const [publisher, setPublisher] = useState('');
  const [noteworthy, setNoteworthy] = useState('');
  const [status, setStatus] = useState<PlayStatus>('not_started');
  const [favorite, setFavorite] = useState(true);
  const [excludeFromStats, setExcludeFromStats] = useState(true);
  const [hidden, setHidden] = useState(true);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [variantOfId, setVariantOfId] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<TagEdit>(NO_TAGS);
  const [genres, setGenres] = useState<TagEdit>(NO_TAGS);
  const [likes, setLikes] = useState<TagEdit>(NO_TAGS);
  const [dislikes, setDislikes] = useState<TagEdit>(NO_TAGS);

  // Each open starts with a clean slate so nothing is written by accident.
  useEffect(() => {
    if (opened) {
      setEnabled({});
      setSeries('');
      setPublisher('');
      setNoteworthy('');
      setStatus('not_started');
      setFavorite(true);
      setExcludeFromStats(true);
      setHidden(true);
      setCollectionId(null);
      setVariantOfId(null);
      setPlatforms(NO_TAGS);
      setGenres(NO_TAGS);
      setLikes(NO_TAGS);
      setDislikes(NO_TAGS);
    }
  }, [opened]);

  const toggle = (key: string) =>
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  const on = (key: string) => !!enabled[key];
  const anyEnabled = Object.values(enabled).some(Boolean);

  const collectionOptions = allGames
    .filter((g: GameEntry) => g.isCollection)
    .map((g) => ({ value: g.id, label: g.title }));
  const variantOptions = allGames
    .filter((g: GameEntry) => !g.variantOfId && !g.isCollection)
    .map((g) => ({ value: g.id, label: g.title }));

  const likesData = uniq([...DEFAULT_LIKES, ...(settings?.customLikes ?? [])]);
  const dislikesData = uniq([...DEFAULT_DISLIKES, ...(settings?.customDislikes ?? [])]);

  function buildSpec(): BulkEditSpec {
    const spec: BulkEditSpec = {};
    if (on('series')) spec.series = series;
    if (on('publisher')) spec.publisher = publisher;
    if (on('noteworthy')) spec.noteworthy = noteworthy;
    if (on('status')) spec.status = status;
    if (on('favorite')) spec.favorite = favorite;
    if (on('excludeFromStats')) spec.excludeFromStats = excludeFromStats;
    if (on('hidden')) spec.hidden = hidden;
    if (on('collectionId')) spec.collectionId = collectionId;
    if (on('variantOfId')) spec.variantOfId = variantOfId;
    if (on('platforms')) spec.platforms = platforms;
    if (on('genres')) spec.genres = genres;
    if (on('likes')) spec.likes = likes;
    if (on('dislikes')) spec.dislikes = dislikes;
    return spec;
  }

  async function persistNewVocab() {
    if (!settings) return;
    const knownLikes = new Set(likesData);
    const knownDislikes = new Set(dislikesData);
    const newLikes = on('likes') ? likes.values.filter((l) => !knownLikes.has(l)) : [];
    const newDislikes = on('dislikes')
      ? dislikes.values.filter((d) => !knownDislikes.has(d))
      : [];
    if (newLikes.length || newDislikes.length) {
      await saveSettings({
        customLikes: uniq([...settings.customLikes, ...newLikes]),
        customDislikes: uniq([...settings.customDislikes, ...newDislikes]),
      });
    }
  }

  async function apply() {
    setBusy(true);
    try {
      const count = await applyBulkEdit(ids, buildSpec());
      await persistNewVocab();
      notifications.show({ color: 'teal', message: `Updated ${count} game${count === 1 ? '' : 's'}.` });
      onApplied();
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const yesNo = (value: boolean, onSet: (v: boolean) => void, disabled: boolean) => (
    <SegmentedControl
      disabled={disabled}
      value={value ? 'yes' : 'no'}
      onChange={(v) => onSet(v === 'yes')}
      data={[
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]}
    />
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Text span fw={700} fz="var(--mantine-h4-font-size)">
          Bulk edit
        </Text>
      }
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Editing {ids.length} game{ids.length === 1 ? '' : 's'}. Turn on only the fields you
          want to change — everything else is left as-is.
        </Text>

        <Divider label="Details" labelPosition="left" />
        <FieldRow label="Series" enabled={on('series')} onToggle={() => toggle('series')}>
          <TextInput
            disabled={!on('series')}
            placeholder="Set series (blank clears it)"
            value={series}
            onChange={(e) => setSeries(e.currentTarget.value)}
          />
        </FieldRow>
        <FieldRow
          label="Publisher"
          enabled={on('publisher')}
          onToggle={() => toggle('publisher')}
        >
          <TextInput
            disabled={!on('publisher')}
            placeholder="Set publisher (blank clears it)"
            value={publisher}
            onChange={(e) => setPublisher(e.currentTarget.value)}
          />
        </FieldRow>
        <FieldRow
          label="Platforms"
          enabled={on('platforms')}
          onToggle={() => toggle('platforms')}
        >
          <TagField
            data={COMMON_PLATFORMS}
            value={platforms}
            onChange={setPlatforms}
            disabled={!on('platforms')}
            placeholder="Platforms"
          />
        </FieldRow>
        <FieldRow label="Genres" enabled={on('genres')} onToggle={() => toggle('genres')}>
          <TagField
            data={COMMON_GENRES}
            value={genres}
            onChange={setGenres}
            disabled={!on('genres')}
            placeholder="Genres"
          />
        </FieldRow>

        <Divider label="Personal" labelPosition="left" mt="sm" />
        <FieldRow label="Play status" enabled={on('status')} onToggle={() => toggle('status')}>
          <Select
            disabled={!on('status')}
            data={STATUS_GROUPS}
            allowDeselect={false}
            value={status}
            onChange={(v) => v && setStatus(v as PlayStatus)}
          />
        </FieldRow>
        <FieldRow label="Likes" enabled={on('likes')} onToggle={() => toggle('likes')}>
          <TagField
            data={likesData}
            value={likes}
            onChange={setLikes}
            disabled={!on('likes')}
            placeholder="What you enjoyed"
          />
        </FieldRow>
        <FieldRow label="Dislikes" enabled={on('dislikes')} onToggle={() => toggle('dislikes')}>
          <TagField
            data={dislikesData}
            value={dislikes}
            onChange={setDislikes}
            disabled={!on('dislikes')}
            placeholder="What didn't land"
          />
        </FieldRow>
        <FieldRow
          label="Noteworthy"
          enabled={on('noteworthy')}
          onToggle={() => toggle('noteworthy')}
        >
          <Textarea
            disabled={!on('noteworthy')}
            autosize
            minRows={2}
            placeholder="Set the same note on all (blank clears it)"
            value={noteworthy}
            onChange={(e) => setNoteworthy(e.currentTarget.value)}
          />
        </FieldRow>
        <FieldRow label="Favorite" enabled={on('favorite')} onToggle={() => toggle('favorite')}>
          {yesNo(favorite, setFavorite, !on('favorite'))}
        </FieldRow>
        <FieldRow
          label="Exclude from stats"
          enabled={on('excludeFromStats')}
          onToggle={() => toggle('excludeFromStats')}
        >
          {yesNo(excludeFromStats, setExcludeFromStats, !on('excludeFromStats'))}
        </FieldRow>
        <FieldRow label="Hidden" enabled={on('hidden')} onToggle={() => toggle('hidden')}>
          {yesNo(hidden, setHidden, !on('hidden'))}
        </FieldRow>

        <Divider label="Collections & versions" labelPosition="left" mt="sm" />
        <FieldRow
          label="Part of collection"
          enabled={on('collectionId')}
          onToggle={() => toggle('collectionId')}
        >
          <Select
            disabled={!on('collectionId')}
            placeholder="Standalone (clears the link)"
            data={collectionOptions}
            value={collectionId}
            onChange={setCollectionId}
            clearable
            searchable
          />
        </FieldRow>
        <FieldRow
          label="Variant of (original game)"
          enabled={on('variantOfId')}
          onToggle={() => toggle('variantOfId')}
        >
          <Select
            disabled={!on('variantOfId')}
            placeholder="Not a variant (clears the link)"
            data={variantOptions}
            value={variantOfId}
            onChange={setVariantOfId}
            clearable
            searchable
          />
        </FieldRow>

        <Divider />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply} loading={busy} disabled={!anyEnabled || !ids.length}>
            Apply to {ids.length} game{ids.length === 1 ? '' : 's'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
