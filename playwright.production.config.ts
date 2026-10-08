import { defineConfig } from '@playwright/test';

// Separate from the normal E2E suite: serves the ordinary production build,
// with VITE_E2E unset, so mock clients and Matching Lab cannot be entered.
export default defineConfig({
  testDir: './e2e-production',
  timeout: 60_000,
  expect: { timeout: 25_000 },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 45_000,
  },
});
