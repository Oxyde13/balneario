/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The local backend (scripts/dev-local) is proxied on the app's own origin, so
// development works anywhere — WSL, containers, editor-forwarded ports — without
// the browser needing to reach a second port.
const LOCAL_BACKEND = process.env.LOCAL_BACKEND_URL ?? 'http://127.0.0.1:54321';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth/v1': LOCAL_BACKEND,
      '/rest/v1': LOCAL_BACKEND,
      '/storage/v1': LOCAL_BACKEND,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
