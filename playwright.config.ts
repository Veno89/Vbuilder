import { defineConfig } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    env: {
      ...process.env,
      NOTIFICATION_INBOX_ENABLED: process.env.NOTIFICATION_INBOX_ENABLED ?? 'true',
      DEV_INBOX_TOKEN: process.env.DEV_INBOX_TOKEN ?? 'dev-inbox-token'
    },
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
    reuseExistingServer: true
  }
});
