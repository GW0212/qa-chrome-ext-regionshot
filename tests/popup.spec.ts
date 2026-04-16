import { test, expect } from './fixtures/extensionFixture';

test.describe('팝업 UI', () => {

  test('TC-P01 : 팝업이 JS 에러 없이 열린다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    expect(errors).toHaveLength(0);
    await page.close();
  });

  test('TC-P02 : 헤더 타이틀이 "RegionShot" 이다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.title')).toHaveText('RegionShot');
    await page.close();
  });

  test('TC-P03 : 서브타이틀이 "빠른 영역 캡쳐" 텍스트를 포함한다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.subtitle')).toContainText('빠른 영역 캡쳐');
    await page.close();
  });

  test('TC-P04 : "영역 캡쳐 시작" 버튼(#captureBtn)이 표시된다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#captureBtn')).toBeVisible();
    await expect(page.locator('#captureBtn')).toContainText('캡쳐');
    await page.close();
  });

  test('TC-P05 : "단축키 지정" 버튼(#setShortcutBtn)이 표시된다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#setShortcutBtn')).toBeVisible();
    await expect(page.locator('#setShortcutBtn')).toContainText('단축키 지정');
    await page.close();
  });

  test('TC-P06 : 단축키 표시(#shortcutDisplay)가 기본 단축키를 보여준다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    const disp = page.locator('#shortcutDisplay');
    await expect(disp).toBeVisible();
    const text = await disp.textContent();
    expect(text).toContain('단축키');
    await page.close();
  });

  test('TC-P07 : 언어 선택(#langSelect)에 7개 언어 옵션이 존재한다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    const options = await page.locator('#langSelect option').count();
    expect(options).toBe(7);
    await page.close();
  });

  test('TC-P08 : 언어를 English 로 변경하면 버튼 텍스트가 영문으로 바뀐다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#langSelect').selectOption('en');
    await page.waitForTimeout(300);
    await expect(page.locator('#captureBtn')).toContainText('Start region capture');
    await expect(page.locator('.subtitle')).toContainText('Quick region capture');
    await page.close();
  });

  test('TC-P09 : 언어를 日本語 로 변경하면 서브타이틀이 일본어로 표시된다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#langSelect').selectOption('ja');
    await page.waitForTimeout(300);
    await expect(page.locator('.subtitle')).toContainText('クイック範囲キャプチャ');
    await page.close();
  });

  test('TC-P10 : 팝업 body 너비가 300px 이상이다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    const width = await page.evaluate(() => document.body.scrollWidth);
    expect(width).toBeGreaterThanOrEqual(300);
    await page.close();
  });

});
