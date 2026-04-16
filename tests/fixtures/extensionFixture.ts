/**
 * extensionFixture.ts
 *
 * [핵심 변경]
 * manifest.json 에 key 필드를 추가해서 extension ID를 고정했습니다.
 * 따라서 Service Worker 감지 없이 ID를 바로 사용합니다.
 *
 * Extension ID: ilpimmbilfamflcjedaaonkcfkmedcpf
 * (manifest.json 의 key 필드로 결정된 고정값)
 */

import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const EXTENSION_PATH = path.resolve(__dirname, '../extension');

// manifest.json 의 key 필드로 결정된 고정 extensionId
const FIXED_EXTENSION_ID = 'ilpimmbilfamflcjedaaonkcfkmedcpf';

type WorkerFixtures = {
  extContext: BrowserContext;
  extensionId: string;
  popupUrl: string;
};

export const test = base.extend<{}, WorkerFixtures>({

  extContext: [async ({}, use) => {
    const userDataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'pw-regionshot-')
    );

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
    });

    // 확장이 완전히 로드될 때까지 대기
    await new Promise(r => setTimeout(r, 3000));

    await use(context);
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }, { scope: 'worker' }],

  // manifest.json key 로 고정된 ID — Service Worker 감지 불필요
  extensionId: [async ({}, use) => {
    await use(FIXED_EXTENSION_ID);
  }, { scope: 'worker' }],

  popupUrl: [async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}/popup.html`);
  }, { scope: 'worker' }],

});

export { expect } from '@playwright/test';
