import { defineConfig } from '@playwright/test';
import path from 'path';

export const EXTENSION_PATH = path.resolve(__dirname, 'extension');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,   // 확장 컨텍스트 충돌 방지
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    headless: false,      // 크롬 확장은 headless 불가
    channel: 'chrome',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chrome-extension',
      use: { headless: false, channel: 'chrome' },
    },
  ],
  timeout: 30_000,
  expect: { timeout: 8_000 },
});
