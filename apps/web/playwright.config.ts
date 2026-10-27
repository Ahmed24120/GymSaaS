import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000',
    browserName: 'chromium',
    channel: process.env.E2E_BROWSER_CHANNEL || 'chrome',
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
