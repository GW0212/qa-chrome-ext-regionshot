/**
 * extensionFixture.ts
 *
 * 핵심 개선사항:
 * 1. 빈 문자열('') 대신 실제 임시 디렉토리 사용 → CI 안정성 향상
 * 2. --disable-gpu 추가 → xvfb 환경 필수 플래그
 * 3. waitForEvent → polling 3단계 fallback
 * 4. scope: 'worker' → 브라우저 1번만 열고 닫기
 */

import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const EXTENSION_PATH = path.resolve(__dirname, '../extension');

// Worker scope fixture 타입 (두 번째 제네릭)
type WorkerFixtures = {
  extContext: BrowserContext;
  extensionId: string;
  popupUrl: string;
};

export const test = base.extend<{}, WorkerFixtures>({

  // ── extContext : 브라우저를 worker당 1번만 열고 닫는다 ──
  extContext: [async ({}, use) => {
    // 실제 임시 디렉토리 생성 (빈 문자열은 일부 CI에서 불안정)
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
        '--disable-gpu',                    // CI xvfb 필수
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
    });

    await use(context);

    await context.close();
    // 임시 디렉토리 정리
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }, { scope: 'worker' }],

  // ── extensionId : 3단계 fallback으로 Service Worker에서 ID 추출 ──
  extensionId: [async ({ extContext }, use) => {
    let sw = extContext.serviceWorkers()[0];

    // 1단계: waitForEvent (빠른 감지)
    if (!sw) {
      sw = await extContext
        .waitForEvent('serviceworker', { timeout: 10_000 })
        .catch(() => undefined as any);
    }

    // 2단계: 1초 간격 polling (최대 15초)
    if (!sw) {
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        sw = extContext.serviceWorkers()[0];
        if (sw) break;
      }
    }

    if (!sw) {
      throw new Error(
        'Service Worker 감지 실패.\n' +
        `extension 경로: ${EXTENSION_PATH}\n` +
        'manifest.json 과 background.js 가 있는지 확인하세요.'
      );
    }

    // chrome-extension://{id}/background.js → id 추출
    const extensionId = sw.url().split('/')[2];
    await use(extensionId);
  }, { scope: 'worker' }],

  // ── popupUrl : popup.html 직접 접근 URL ──
  popupUrl: [async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}/popup.html`);
  }, { scope: 'worker' }],

});

export { expect } from '@playwright/test';
