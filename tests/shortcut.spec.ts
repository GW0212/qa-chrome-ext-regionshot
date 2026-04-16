import { test, expect } from './fixtures/extensionFixture';

test.describe('단축키 설정', () => {

  test('TC-S01 : #setShortcutBtn 클릭 시 #recordHint 가 나타난다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#recordHint')).toBeHidden();
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);
    await expect(page.locator('#recordHint')).toBeVisible();
    await page.close();
  });

  test('TC-S02 : #recordHint 는 초기 상태에서 숨겨져 있다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#recordHint')).toBeHidden();
    await page.close();
  });

  test('TC-S03 : 단축키 지정 모드에서 ESC 누르면 #recordHint 가 사라진다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.locator('#recordHint')).toBeHidden();
    await page.close();
  });

  test('TC-S04 : ESC 취소 후 #shortcutDisplay 가 기존 단축키를 유지한다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    const before = await page.locator('#shortcutDisplay').textContent();
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const after = await page.locator('#shortcutDisplay').textContent();
    expect(after).toBe(before);
    await page.close();
  });

  test('TC-S05 : 키 입력 후 #shortcutDisplay 가 새 단축키로 업데이트된다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#setShortcutBtn').click();
    await page.waitForTimeout(100);
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.down('A');
    await page.keyboard.up('A');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await page.waitForTimeout(700);
    const disp = await page.locator('#shortcutDisplay').textContent();
    expect(disp).toContain('Ctrl');
    await page.close();
  });

  test('TC-S06 : chrome.storage API 가 팝업에서 접근 가능하다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    const available = await page.evaluate(
      () => typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined'
    );
    expect(available).toBe(true);
    await page.close();
  });

  test('TC-S07 : chrome.tabs API 가 팝업에서 접근 가능하다', async ({ extContext, popupUrl }) => {
    const page = await extContext.newPage();
    await page.goto(popupUrl);
    await page.waitForLoadState('domcontentloaded');
    const available = await page.evaluate(
      () => typeof chrome !== 'undefined' && typeof chrome.tabs !== 'undefined'
    );
    expect(available).toBe(true);
    await page.close();
  });

});
