/**
 * extensionFixture.ts
 *
 * [핵심 변경]
 * CI(xvfb) 환경에서 Service Worker가 등록되지 않는 문제를 해결하기 위해
 * chrome://extensions 페이지의 Shadow DOM을 파싱해서 extensionId를 추출합니다.
 *
 * 추출 우선순위:
 * 1. context.serviceWorkers() — 이미 등록된 경우 즉시 사용
 * 2. context.waitForEvent('serviceworker') — 등록 이벤트 대기 (5초)
 * 3. chrome://extensions 페이지 Shadow DOM 파싱 — CI 최종 fallback
 */

import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const EXTENSION_PATH = path.resolve(__dirname, '../extension');

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
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    // 브라우저가 완전히 뜰 때까지 잠시 대기
    await new Promise(r => setTimeout(r, 2000));

    await use(context);
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }, { scope: 'worker' }],

  extensionId: [async ({ extContext }, use) => {
    let extensionId: string | undefined;

    // ── 방법 1: 이미 등록된 Service Worker ──────────────
    const existing = extContext.serviceWorkers();
    if (existing.length > 0) {
      extensionId = existing[0].url().split('/')[2];
      console.log('✅ extensionId (SW 즉시):', extensionId);
    }

    // ── 방법 2: Service Worker 이벤트 대기 (5초) ────────
    if (!extensionId) {
      try {
        const sw = await extContext.waitForEvent('serviceworker', { timeout: 5000 });
        extensionId = sw.url().split('/')[2];
        console.log('✅ extensionId (SW 이벤트):', extensionId);
      } catch {
        console.log('⚠️ Service Worker 이벤트 미감지, chrome://extensions 로 fallback');
      }
    }

    // ── 방법 3: chrome://extensions Shadow DOM 파싱 ─────
    if (!extensionId) {
      const page = await extContext.newPage();
      try {
        await page.goto('chrome://extensions');
        await page.waitForTimeout(3000);

        extensionId = await page.evaluate((): string | undefined => {
          // Shadow DOM을 재귀적으로 탐색해서 extensions-item 의 id 속성 추출
          function queryShadow(root: Document | ShadowRoot, selector: string): Element | null {
            const direct = (root as Document).querySelector(selector);
            if (direct) return direct;

            const all = (root as Document).querySelectorAll('*');
            for (const el of Array.from(all)) {
              if (el.shadowRoot) {
                const found = queryShadow(el.shadowRoot as unknown as Document, selector);
                if (found) return found;
              }
            }
            return null;
          }

          const item = queryShadow(document, 'extensions-item');
          return item?.getAttribute('id') ?? undefined;
        });

        if (extensionId) {
          console.log('✅ extensionId (chrome://extensions):', extensionId);
        }
      } catch (e) {
        console.error('chrome://extensions 파싱 실패:', e);
      } finally {
        await page.close();
      }
    }

    // ── 방법 4: polling으로 재시도 ──────────────────────
    if (!extensionId) {
      console.log('⚠️ 마지막 수단: polling 시도 (최대 10초)');
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const sws = extContext.serviceWorkers();
        if (sws.length > 0) {
          extensionId = sws[0].url().split('/')[2];
          console.log('✅ extensionId (polling):', extensionId);
          break;
        }
      }
    }

    if (!extensionId) {
      throw new Error(
        'extensionId 추출 실패.\n' +
        `extension 경로: ${EXTENSION_PATH}\n` +
        'manifest.json 에 background.service_worker 가 있는지 확인하세요.'
      );
    }

    await use(extensionId);
  }, { scope: 'worker' }],

  popupUrl: [async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}/popup.html`);
  }, { scope: 'worker' }],

});

export { expect } from '@playwright/test';
