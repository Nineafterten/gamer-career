import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Code,
  Group,
  Progress,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  FileButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconDownload,
  IconPlus,
  IconUpload,
} from '@tabler/icons-react';

import { useGames, useSettings } from '../db/hooks';
import { createGame, type GameDraft } from '../db/repository';
import {
  flagDuplicates,
  parseBulk,
  type DupKind,
  type ParsedRow,
} from '../lib/bulkImport';
import {
  getGameDetail,
  searchGames,
  toPublicFields,
  type PublicFieldsPatch,
} from '../lib/rawg';
import { toDisplayScore } from '../lib/stats';
import { StatusBadge } from '../components/common/StatusBadge';

const EXAMPLE = `Title, Platform, Play Status, Favorite, Score, Series
Hollow Knight, Switch, Completed, yes, 9.5, Hollow Knight
Stardew Valley, PC, Active, , 9,
Tunic, Xbox One, Backlog, , , `;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function rowToDraft(row: ParsedRow, patch?: PublicFieldsPatch): GameDraft {
  return {
    title: patch?.title ?? row.title,
    publisher: patch?.publisher,
    releaseDate: patch?.releaseDate,
    platforms: row.platforms.length ? row.platforms : (patch?.platforms ?? []),
    publicScore: patch?.publicScore,
    wikiUrl: patch?.wikiUrl,
    genres: patch?.genres ?? [],
    series: row.series,
    coverImageUrl: patch?.coverImageUrl,
    rawgId: patch?.rawgId,
    status: row.status,
    personalScore: row.personalScore,
    likes: [],
    dislikes: [],
    favorite: row.favorite ?? false,
  };
}

function DupBadge({ kind }: { kind: DupKind }) {
  if (!kind) return null;
  return (
    <Badge color="orange" variant="light" size="sm">
      {kind === 'library' ? 'In library' : 'In batch'}
    </Badge>
  );
}

export function BulkImport() {
  const games = useGames();
  const settings = useSettings();
  const navigate = useNavigate();

  const [text, setText] = useState('');
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [dups, setDups] = useState<DupKind[]>([]);
  const [include, setInclude] = useState<boolean[]>([]);
  const [patches, setPatches] = useState<Record<number, PublicFieldsPatch>>({});
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pendingPrefill, setPendingPrefill] = useState<string | null>(null);

  function parseText(value: string) {
    const { rows: parsed, errors } = parseBulk(value);
    const flags = flagDuplicates(parsed, games ?? []);
    setRows(parsed);
    setDups(flags);
    setInclude(flags.map((d) => d === null)); // duplicates start unchecked
    setPatches({});
    setParseErrors(errors);
  }

  function handleParse() {
    parseText(text);
  }

  // A "Sync from Xbox" hand-off drops a JSON list into sessionStorage and routes
  // here; load it into the textarea and parse once the library has loaded (so
  // duplicate detection works on the first pass).
  useEffect(() => {
    const prefill = sessionStorage.getItem('gc-bulk-prefill');
    if (prefill) {
      sessionStorage.removeItem('gc-bulk-prefill');
      setText(prefill);
      setPendingPrefill(prefill);
    }
  }, []);

  useEffect(() => {
    if (pendingPrefill !== null && games) {
      parseText(pendingPrefill);
      setPendingPrefill(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrefill, games]);

  function loadFile(file: File | null) {
    if (!file) return;
    file.text().then(setText);
  }

  const includedIndexes = () =>
    (rows ?? []).map((_, i) => i).filter((i) => include[i]);

  async function handleFetchMetadata() {
    if (!rows) return;
    const targets = includedIndexes();
    setFetching(true);
    setFetchProgress(0);
    let done = 0;
    for (const i of targets) {
      try {
        const results = await searchGames(rows[i].title, settings?.rawgApiKey);
        if (results[0]) {
          const detail = await getGameDetail(results[0].id, settings?.rawgApiKey);
          setPatches((p) => ({ ...p, [i]: toPublicFields(detail) }));
        }
      } catch (err) {
        notifications.show({ color: 'red', message: (err as Error).message });
        break; // likely a bad key or rate limit — stop early
      }
      done += 1;
      setFetchProgress(Math.round((done / targets.length) * 100));
      await sleep(350); // be gentle with the free tier
    }
    setFetching(false);
  }

  async function handleCreate() {
    if (!rows) return;
    const targets = includedIndexes();
    setCreating(true);
    try {
      for (const i of targets) {
        await createGame(rowToDraft(rows[i], patches[i]));
      }
      notifications.show({
        color: 'teal',
        message: `Added ${targets.length} game${targets.length === 1 ? '' : 's'}.`,
      });
      navigate('/games');
    } catch (err) {
      notifications.show({ color: 'red', message: (err as Error).message });
    } finally {
      setCreating(false);
    }
  }

  const includeCount = include.filter(Boolean).length;
  const dupCount = dups.filter(Boolean).length;
  const hasKey = Boolean(settings?.rawgApiKey);

  return (
    <Stack gap="lg" maw={900}>
      <div>
        <Title order={2}>Bulk Add</Title>
        <Text c="dimmed">
          Paste or upload a CSV/JSON list, review duplicates, optionally fetch metadata,
          then create the records.
        </Text>
      </div>

      <Card withBorder radius="md" padding="lg">
        <Text size="sm" mb="xs">
          Columns: <Code>Title</Code>, <Code>Platform</Code>, <Code>Play Status</Code>{' '}
          (optional <Code>Favorite</Code>, <Code>Score</Code>, <Code>Series</Code>).
          Separate multiple platforms with <Code>;</Code>. A header row is optional.
        </Text>
        <Textarea
          autosize
          minRows={5}
          maxRows={14}
          placeholder={EXAMPLE}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        <Group mt="sm">
          <Button onClick={handleParse} disabled={!text.trim()}>
            Parse list
          </Button>
          <FileButton accept=".csv,.json,text/csv,application/json" onChange={loadFile}>
            {(props) => (
              <Button variant="light" leftSection={<IconUpload size={16} />} {...props}>
                Upload file…
              </Button>
            )}
          </FileButton>
          <Button variant="subtle" onClick={() => setText(EXAMPLE)}>
            Load example
          </Button>
        </Group>
      </Card>

      {parseErrors.length > 0 && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} title="Some rows were skipped">
          <Stack gap={2}>
            {parseErrors.map((e, i) => (
              <Text key={i} size="sm">
                {e}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      {rows && rows.length > 0 && (
        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between" mb="sm">
            <Text size="sm" c="dimmed">
              {rows.length} rows · {dupCount} duplicate{dupCount === 1 ? '' : 's'} ·{' '}
              {includeCount} to add
            </Text>
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<IconDownload size={16} />}
                onClick={handleFetchMetadata}
                loading={fetching}
                disabled={!hasKey || includeCount === 0}
                title={hasKey ? undefined : 'Add a RAWG key in Settings first'}
              >
                Fetch metadata
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleCreate}
                loading={creating}
                disabled={includeCount === 0}
              >
                Add {includeCount} game{includeCount === 1 ? '' : 's'}
              </Button>
            </Group>
          </Group>

          {fetching && <Progress value={fetchProgress} mb="sm" />}

          <Table.ScrollContainer minWidth={680}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}></Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Platforms</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Score</Table.Th>
                  <Table.Th>Flags</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>
                      <Checkbox
                        checked={include[i] ?? false}
                        onChange={(e) =>
                          setInclude((prev) => {
                            const next = [...prev];
                            next[i] = e.currentTarget.checked;
                            return next;
                          })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{patches[i]?.title ?? row.title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {(row.platforms.length ? row.platforms : patches[i]?.platforms ?? []).join(
                          ', ',
                        ) || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={row.status} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {toDisplayScore(row.personalScore ?? patches[i]?.publicScore)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <DupBadge kind={dups[i]} />
                        {!row.statusRecognized && (
                          <Badge color="gray" variant="light" size="sm">
                            status?
                          </Badge>
                        )}
                        {patches[i] && (
                          <Badge color="teal" variant="light" size="sm">
                            enriched
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      {rows && rows.length === 0 && (
        <Alert color="gray">No rows parsed — check your format and try again.</Alert>
      )}
    </Stack>
  );
}
