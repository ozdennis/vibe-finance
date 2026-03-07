import { test, expect } from '@playwright/test';

test.describe('Vibe Finance - Core Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('1. Dashboard loads', async ({ page }) => {
    await expect(page.locator('text=Net Liquidity')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/01-dashboard.png' });
  });

  test('2. Settings page loads', async ({ page }) => {
    await page.click('a[aria-label="Settings"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Settings')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/02-settings.png' });
  });

  test('3. Quick Log drawer opens', async ({ page }) => {
    await page.click('button[aria-label="Add Transaction"]');
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/03-quick-log.png' });
  });

  test('4. Transaction types selectable', async ({ page }) => {
    await page.click('button[aria-label="Add Transaction"]');
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    
    // Click INCOME
    await page.click('button:has-text("INCOME")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/screenshots/04-income-selected.png' });
    
    // Click TRANSFER
    await page.click('button:has-text("TRANSFER")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/05-transfer-selected.png' });
  });
});
