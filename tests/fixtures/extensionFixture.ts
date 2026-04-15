/**
 * extensionFixture.ts
 *
 * Playwright 에서 크롬 확장 프로그램을 테스트하기 위한 공통 fixture.
 *
 * 동작 원리:
 * 1. chromium.launchPersistentContext 로 unpacked 확장 로드
 * 2. RegionShot 의 Service Worker URL 에서 extension ID 를 자동 추출
 * 3. chrome-extension://{id}/popup.html 로 팝업에 직접 접근
 */

import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../extension');

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  popupUrl: string;
};

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // MV3 Service Worker URL: chrome-extension://{id}/background.js
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    const extensionId = sw.url().split('/')[2];
    await use(extensionId);
  },

  popupUrl: async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}/popup.html`);
  },
});

export { expect } from '@playwright/test';
