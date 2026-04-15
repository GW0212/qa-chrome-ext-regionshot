/**
 * QA Automation — RegionShot Chrome Extension
 * 파일: popup.spec.ts
 * 유형: 팝업 UI 검증
 *
 * 실제 popup.html 기준 selector 사용:
 *   #captureBtn, #setShortcutBtn, #shortcutDisplay, #recordHint,
 *   #warn, #langSelect, .title, .subtitle, .pill, .btnLabel
 *
 * TC-P01 : 팝업이 JS 에러 없이 열린다
 * TC-P02 : 헤더 타이틀이 "RegionShot" 이다
 * TC-P03 : 서브타이틀이 "빠른 영역 캡쳐" 텍스트를 포함한다
 * TC-P04 : "영역 캡쳐 시작" 버튼(#captureBtn)이 표시된다
 * TC-P05 : "단축키 지정" 버튼(#setShortcutBtn)이 표시된다
 * TC-P06 : 단축키 표시 영역(#shortcutDisplay)이 기본값을 보여준다
 * TC-P07 : 언어 선택(#langSelect)에 7개 언어가 존재한다
 * TC-P08 : 언어를 English로 바꾸면 UI 텍스트가 영문으로 변경된다
 * TC-P09 : 언어를 日本語로 바꾸면 서브타이틀이 일본어로 표시된다
 * TC-P10 : 팝업 너비가 300px 이상이다 (width: 320px 설계 기준)
 */

import { test, expect } from './fixtures/extensionFixture';

test.describe('팝업 UI', () => {

  // ── TC-P01 ──────────────────────────────────────────────
  test('TC-P01 : 팝업이 JS 에러 없이 열린다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    expect(errors).toHaveLength(0);
    await page.close();
  });

  // ── TC-P02 ──────────────────────────────────────────────
  test('TC-P02 : 헤더 타이틀이 "RegionShot" 이다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('.title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('RegionShot');
    await page.close();
  });

  // ── TC-P03 ──────────────────────────────────────────────
  test('TC-P03 : 서브타이틀이 "빠른 영역 캡쳐" 텍스트를 포함한다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('빠른 영역 캡쳐');
    await page.close();
  });

  // ── TC-P04 ──────────────────────────────────────────────
  test('TC-P04 : "영역 캡쳐 시작" 버튼(#captureBtn)이 표시된다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const captureBtn = page.locator('#captureBtn');
    await expect(captureBtn).toBeVisible();
    await expect(captureBtn).toContainText('캡쳐');
    await page.close();
  });

  // ── TC-P05 ──────────────────────────────────────────────
  test('TC-P05 : "단축키 지정" 버튼(#setShortcutBtn)이 표시된다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const setBtn = page.locator('#setShortcutBtn');
    await expect(setBtn).toBeVisible();
    await expect(setBtn).toContainText('단축키 지정');
    await page.close();
  });

  // ── TC-P06 ──────────────────────────────────────────────
  test('TC-P06 : 단축키 표시(#shortcutDisplay)가 기본 단축키를 보여준다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const disp = page.locator('#shortcutDisplay');
    await expect(disp).toBeVisible();

    const text = await disp.textContent();
    // "단축키: Ctrl+Shift+1" 형태여야 함
    expect(text).toContain('단축키');
    expect(text?.trim().length).toBeGreaterThan(0);
    await page.close();
  });

  // ── TC-P07 ──────────────────────────────────────────────
  test('TC-P07 : 언어 선택(#langSelect)에 7개 언어 옵션이 존재한다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const langSelect = page.locator('#langSelect');
    await expect(langSelect).toBeVisible();

    const options = await langSelect.locator('option').count();
    expect(options).toBe(7); // ko, en, ja, zh, fr, de, nl
    await page.close();
  });

  // ── TC-P08 ──────────────────────────────────────────────
  test('TC-P08 : 언어를 English 로 변경하면 버튼 텍스트가 영문으로 바뀐다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    // 언어 변경: 한국어 → English
    await page.locator('#langSelect').selectOption('en');
    await page.waitForTimeout(300);

    // "Start region capture" 텍스트 확인 (popup.js I18N.en.startCapture)
    const captureBtn = page.locator('#captureBtn');
    await expect(captureBtn).toContainText('Start region capture');

    // 서브타이틀도 영문으로 변경
    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toContainText('Quick region capture');
    await page.close();
  });

  // ── TC-P09 ──────────────────────────────────────────────
  test('TC-P09 : 언어를 日本語 로 변경하면 서브타이틀이 일본어로 표시된다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('#langSelect').selectOption('ja');
    await page.waitForTimeout(300);

    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toContainText('クイック範囲キャプチャ');
    await page.close();
  });

  // ── TC-P10 ──────────────────────────────────────────────
  test('TC-P10 : 팝업 body 너비가 300px 이상이다', async ({ context, popupUrl }) => {
    const page = await context.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');

    const width = await page.evaluate(() => document.body.scrollWidth);
    // popup.html body { width: 320px } 설계 기준
    expect(width).toBeGreaterThanOrEqual(300);
    await page.close();
  });

});
