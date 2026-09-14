import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import './lib/i18n';
import './index.css';
import App from './App';

const WEEK = 7 * 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// Only signed photo URLs are persisted between visits, so the browser keeps
// reusing the same URL (and its HTTP cache) instead of downloading photos again.
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'balneario-photo-cache',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: WEEK,
        buster: 'v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.queryKey[0] === 'photo-url' && query.state.status === 'success',
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
