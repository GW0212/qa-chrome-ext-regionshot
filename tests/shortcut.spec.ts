/**
 * QA Automation — RegionShot Chrome Extension
 * 파일: shortcut.spec.ts
 * 유형: 단축키 설정 검증
 *
 * popup.js 분석 기반:
 *  - #setShortcutBtn 클릭 → #recordHint 표시 (display:block)
 *  - 키 입력 → 400ms 뒤 자동 저장 → #recordHint 숨김, #shortcutDisplay 업데이트
 *  - ESC 키 → 입력 취소 → 기존 단축키 유지
 *  - chrome.storage.sync 에 { customShortcut: [...] } 저장
 *
 * TC-S01 : #setShortcutBtn 클릭 시 #recordHint 가 나타난다
 * TC-S02 : #recordHint 초기 상태는 숨김(display:none)이다
 * TC-S03 : 단축키 지정 모드에서 ESC 누르면 #recordHint 가 사라진다
 * TC-S04 : 단축키 지정 모드에서 ESC 누르면 기존 단축키가 유지된다
 * TC-S05 : 키 입력 후 #shortcutDisplay 가 새 단축키로 업데이트된다
 * TC-S06 : chrome.storage API 가 팝업에서 접근 가능하다
 * TC-S07 : chrome.tabs API 가 팝업에서 접근 가능하다
 */

import { test, expect } from './fixtures/extensionFixture';

test.describe('단축키 설정', () => {

  // ── TC-S01 ──────────────────────────────────────────────
  test('TC-S01 : #setShortcutBtn 클릭 시 #recordHint 가 나타난다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    // 초기에는 숨겨져 있어야 함
    const hint = page.locator('#recordHint');
    await expect(hint).toBeHidden();

    // 단축키 지정 버튼 클릭
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);

    // 클릭 후 표시되어야 함
    await expect(hint).toBeVisible();
    await page.close();
  });

  // ── TC-S02 ──────────────────────────────────────────────
  test('TC-S02 : #recordHint 는 초기 상태에서 숨겨져 있다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    // popup.html: #recordHint { display:none }
    const hint = page.locator('#recordHint');
    await expect(hint).toBeHidden();
    await page.close();
  });

  // ── TC-S03 ──────────────────────────────────────────────
  test('TC-S03 : 단축키 지정 모드에서 ESC 누르면 #recordHint 가 사라진다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    // 단축키 지정 모드 진입
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#recordHint')).toBeVisible();

    // ESC 키로 취소 (popup.js: if (e.key === "Escape") cancel())
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    await expect(page.locator('#recordHint')).toBeHidden();
    await page.close();
  });

  // ── TC-S04 ──────────────────────────────────────────────
  test('TC-S04 : ESC 취소 후 #shortcutDisplay 가 기존 단축키를 유지한다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    // 기존 단축키 텍스트 저장
    const before = await page.locator('#shortcutDisplay').textContent();

    // 단축키 지정 모드 진입 후 ESC
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 취소 후 기존 텍스트와 동일해야 함
    const after = await page.locator('#shortcutDisplay').textContent();
    expect(after).toBe(before);
    await page.close();
  });

  // ── TC-S05 ──────────────────────────────────────────────
  test('TC-S05 : 키 입력 후 #shortcutDisplay 가 새 단축키로 업데이트된다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    // 단축키 지정 모드 진입
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);

    // Ctrl+Shift+A 입력 (popup.js onDown: pressed.add(normKey(e.key)), 400ms 후 finish)
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.down('A');
    await page.keyboard.up('A');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');

    // 400ms 타이머 대기
    await page.waitForTimeout(700);

    const disp = await page.locator('#shortcutDisplay').textContent();
    // 새 단축키 텍스트에 Ctrl, Shift, A 중 하나 이상 포함되어야 함
    expect(disp).toContain('Ctrl');
    await page.close();
  });

  // ── TC-S06 ──────────────────────────────────────────────
  test('TC-S06 : chrome.storage API 가 팝업에서 접근 가능하다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const available = await page.evaluate(
      () => typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined'
    );
    expect(available).toBe(true);
    await page.close();
  });

  // ── TC-S07 ──────────────────────────────────────────────
  test('TC-S07 : chrome.tabs API 가 팝업에서 접근 가능하다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const available = await page.evaluate(
      () => typeof chrome !== 'undefined' && typeof chrome.tabs !== 'undefined'
    );
    expect(available).toBe(true);
    await page.close();
  });

});
