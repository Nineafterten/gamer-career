import { lazy, Suspense, type ReactNode } from 'react';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  ActionIcon,
  Title,
  Tooltip,
  useMantineColorScheme,
  useComputedColorScheme,
  Button,
  Center,
  Loader,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Routes, Route, Link, useLocation, type Location } from 'react-router-dom';
import {
  IconDeviceGamepad2,
  IconLayoutDashboard,
  IconList,
  IconClock,
  IconPlayerPlay,
  IconPlayerPause,
  IconTrophy,
  IconCircleCheck,
  IconClipboardList,
  IconHeart,
  IconShoppingCart,
  IconSkull,
  IconSettings,
  IconSun,
  IconMoon,
  IconPlus,
  IconFileImport,
  IconEyeOff,
} from '@tabler/icons-react';

import { GameModal } from './components/modal/GameModal';
import { useGameModal } from './components/modal/useGameModal';

// Route screens are code-split so the dashboard's first paint stays light —
// Recharts (the heaviest dep) only loads when a games view opens.
const Dashboard = lazy(() =>
  import('./routes/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const GamesView = lazy(() =>
  import('./routes/GamesView').then((m) => ({ default: m.GamesView })),
);
const BulkImport = lazy(() =>
  import('./routes/BulkImport').then((m) => ({ default: m.BulkImport })),
);
const Settings = lazy(() =>
  import('./routes/Settings').then((m) => ({ default: m.Settings })),
);

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', to: '/', icon: <IconLayoutDashboard size={18} /> },
      { label: 'All Games', to: '/games', icon: <IconList size={18} /> },
    ],
  },
  {
    title: 'By status',
    items: [
      { label: 'Backlog', to: '/games?preset=backlog', icon: <IconClock size={18} /> },
      { label: 'In Play', to: '/games?preset=in_play', icon: <IconPlayerPlay size={18} /> },
      { label: 'Paused', to: '/games?preset=paused', icon: <IconPlayerPause size={18} /> },
      { label: 'Completed', to: '/games?preset=completed', icon: <IconTrophy size={18} /> },
      { label: 'Done With', to: '/games?preset=done_with', icon: <IconCircleCheck size={18} /> },
      { label: 'Abandoned', to: '/games?preset=abandoned', icon: <IconSkull size={18} /> },
    ],
  },
  {
    title: 'Lists',
    items: [
      { label: 'Needs Review', to: '/games?preset=needs_review', icon: <IconClipboardList size={18} /> },
      { label: 'Favorites', to: '/games?preset=favorites', icon: <IconHeart size={18} /> },
      { label: 'Wishlist', to: '/games?preset=wishlist', icon: <IconShoppingCart size={18} /> },
    ],
  },
  {
    title: 'Manage',
    items: [
      { label: 'Hidden', to: '/games?preset=hidden', icon: <IconEyeOff size={18} /> },
      { label: 'Bulk Add', to: '/bulk', icon: <IconFileImport size={18} /> },
      { label: 'Settings', to: '/settings', icon: <IconSettings size={18} /> },
    ],
  },
];

function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computed === 'dark';
  return (
    <Tooltip label={isDark ? 'Light mode' : 'Dark mode'}>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Toggle color scheme"
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
      >
        {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

function isNavActive(to: string, location: Location): boolean {
  if (to === '/') return location.pathname === '/';
  const [path, query = ''] = to.split('?');
  if (location.pathname !== path) return false;
  if (path === '/games') {
    // All /games links share the same path and differ only by ?preset= —
    // match on the preset so they don't all highlight at once.
    const itemPreset = new URLSearchParams(query).get('preset');
    const curPreset = new URLSearchParams(location.search).get('preset');
    return itemPreset === curPreset;
  }
  return true; // /bulk, /settings — exact pathname match
}

function NavMenu({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  return (
    <ScrollArea>
      {NAV_SECTIONS.map((section, i) => (
        <div key={section.title ?? `s${i}`}>
          {section.title && (
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" px="sm" mt="sm" mb={4}>
              {section.title}
            </Text>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
              leftSection={item.icon}
              active={isNavActive(item.to, location)}
              onClick={onNavigate}
            />
          ))}
        </div>
      ))}
    </ScrollArea>
  );
}

export function App() {
  const [opened, { toggle, close }] = useDisclosure();
  const modal = useGameModal();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconDeviceGamepad2 size={26} color="var(--mantine-color-violet-5)" />
            <Title order={3} visibleFrom="xs">
              Gamer Career
            </Title>
          </Group>
          <Group gap="sm">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={modal.openCreate}
              visibleFrom="xs"
            >
              Add Game
            </Button>
            <ActionIcon
              onClick={modal.openCreate}
              size="lg"
              hiddenFrom="xs"
              aria-label="Add game"
            >
              <IconPlus size={18} />
            </ActionIcon>
            <ThemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <NavMenu onNavigate={close} />
      </AppShell.Navbar>

      <AppShell.Main>
        <Suspense
          fallback={
            <Center h={400}>
              <Loader />
            </Center>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/games" element={<GamesView />} />
            <Route path="/bulk" element={<BulkImport />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </AppShell.Main>

      <GameModal />
    </AppShell>
  );
}
