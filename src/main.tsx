import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter } from 'react-router-dom';

import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';
import './index.css';

import { theme } from './theme';
import { App } from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ensureSeeded } from './db/seed';
import { getSettings, db } from './db/database';
import * as repo from './db/repository';

async function bootstrap() {
  try {
    await getSettings(); // ensure the settings row exists before any read-only hook
    await ensureSeeded();
  } catch (err) {
    // Seeding failures shouldn't block the app from loading.
    console.error('Bootstrap failed', err);
  }

  if (import.meta.env.DEV) {
    // Dev-only console handle for debugging; stripped from production builds.
    (window as unknown as { gc: unknown }).gc = { db, ...repo };
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <ModalsProvider>
          <Notifications position="top-right" />
          <BrowserRouter
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </BrowserRouter>
        </ModalsProvider>
      </MantineProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
