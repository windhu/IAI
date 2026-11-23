import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Pixel 7'],
    channel: process.env.PW_CHANNEL ?? 'chrome',
    baseURL: 'http://localhost:4173/',
    locale: 'zh-CN',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: 'http://localhost:4174/carkeeper/',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
