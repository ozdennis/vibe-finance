import { test, expect } from '@playwright/test';

test.describe('Transaction Creation - Simple Test', () => {
  
  test('Create INCOME transaction and verify in list', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Get initial transaction count
    const initialCount = await page.locator('[class*="bg-slate-800/50"]').filter({ hasText: /Rp/ }).count();
    console.log('Initial transaction count:', initialCount);

    // Open Quick Log drawer
    await page.locator('button[aria-label="Add Transaction"]').click();
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    await page.waitForTimeout(2000);

    // Select INCOME type
    await page.locator('button:has-text("INCOME")').click();
    await page.waitForTimeout(500);

    // Fill amount
    await page.locator('input[placeholder="0"]').click();
    await page.locator('input[placeholder="0"]').fill('500000');
    await page.waitForTimeout(500);

    // Click on account select to open dropdown
    await page.locator('select').first().click();
    await page.waitForTimeout(500);
    
    // Find and click on first account option (not the placeholder)
    const firstAccountOption = page.locator('select option').nth(1);
    const accountValue = await firstAccountOption.getAttribute('value');
    console.log('Selected account ID:', accountValue);
    
    if (accountValue) {
      await page.locator('select').first().selectOption(accountValue);
    } else {
      await page.locator('select').first().selectOption({ index: 1 });
    }
    await page.waitForTimeout(1000);

    // Fill description
    await page.locator('input[placeholder="What was this for?"]').fill('PW test ' + Date.now());
    const testDescription = await page.locator('input[placeholder="What was this for?"]').inputValue();

    // Submit
    await page.locator('button:has-text("Record Transaction")').click();
    console.log('Form submitted, waiting for reload...');
    
    // Wait for reload
    await page.waitForTimeout(10000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Check for our transaction
    const transactionList = page.locator('text=Recent Transactions');
    await expect(transactionList).toBeVisible();
    
    // Check for our transaction description
    const newTransaction = page.locator(`text=${testDescription}`);
    await newTransaction.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('Transaction not found, checking all transactions...');
    });
    
    // Count transactions
    const finalCount = await page.locator('[class*="bg-slate-800/50"]').filter({ hasText: /Rp/ }).count();
    console.log('Final transaction count:', finalCount);
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/test-income-result.png' });
    
    // The transaction should exist (either we find it or count increased)
    expect(finalCount).toBeGreaterThan(initialCount);
  });
});
