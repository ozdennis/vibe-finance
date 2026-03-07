import { test, expect } from '@playwright/test';

test.describe('Direct API Test', () => {
  test('Create transaction via form data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Open drawer
    await page.locator('button[aria-label="Add Transaction"]').click();
    await page.waitForSelector('text=Quick Log');
    await page.waitForTimeout(3000);
    
    console.log('Drawer opened');
    
    // Select INCOME
    await page.locator('button:has-text("INCOME")').click();
    await page.waitForTimeout(1000);
    console.log('INCOME selected');
    
    // Fill amount
    await page.locator('input[placeholder="0"]').click();
    await page.locator('input[placeholder="0"]').fill('100000');
    await page.waitForTimeout(1000);
    console.log('Amount filled');
    
    // Select account - wait for select to be ready
    const accountSelect = page.locator('select').first();
    await accountSelect.waitFor({ state: 'visible' });
    await accountSelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);
    console.log('Account selected');
    
    // Description
    await page.locator('input[placeholder="What was this for?"]').fill('Direct API Test');
    await page.waitForTimeout(500);
    console.log('Description filled');
    
    // Check if submit button is enabled
    const submitButton = page.locator('button:has-text("Record Transaction")');
    const isDisabled = await submitButton.isDisabled();
    console.log('Submit button disabled:', isDisabled);
    
    // Click submit
    await submitButton.click();
    console.log('Submit clicked');
    
    // Wait for any alert/error message
    await page.waitForTimeout(5000);
    
    // Check for alert
    const alertLocator = page.locator('[role="alert"]');
    if (await alertLocator.count() > 0) {
      const alertText = await alertLocator.textContent();
      console.log('ALERT:', alertText);
    }
    
    // Wait longer
    await page.waitForTimeout(10000);
    
    // Reload and check
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Count transactions
    const txCount = await page.locator('[class*="bg-slate-800/50"]').filter({ hasText: /Rp/ }).count();
    console.log('Transaction count after:', txCount);
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/direct-api-result.png' });
  });
});
