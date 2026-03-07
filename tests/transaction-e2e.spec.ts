import { test, expect } from '@playwright/test';

test.describe('Transaction Creation - E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Create INCOME transaction', async ({ page }) => {
    // Get initial balance - find Cash Wallet specifically
    const cashWalletElement = page.locator('[class*="bg-slate-900"]').filter({ hasText: 'Cash Wallet' }).filter({ hasText: 'CASH' }).first();
    const initialBalanceText = await cashWalletElement.textContent();
    const initialBalance = parseInt(initialBalanceText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');
    console.log('Initial Cash Wallet balance:', initialBalance);

    // Open Quick Log drawer
    const fabButton = page.locator('button[aria-label="Add Transaction"]');
    await fabButton.click();
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    await page.waitForTimeout(500);

    // Select INCOME type
    await page.locator('button:has-text("INCOME")').click();
    await page.waitForTimeout(500);

    // Fill amount
    await page.locator('input[placeholder="0"]').fill('1000000');
    await page.waitForTimeout(300);

    // Select account by clicking on the option that contains "Cash Wallet"
    await page.locator('select').first().click();
    await page.locator('select option:has-text("Cash Wallet")').first().waitFor({ state: 'visible' });
    await page.locator('select').first().selectOption({ label: /Cash Wallet/ });
    await page.waitForTimeout(500);

    // Fill description
    await page.locator('input[placeholder="What was this for?"]').fill('Test income');

    // Submit
    await page.locator('button:has-text("Record Transaction")').click();
    
    // Wait for the drawer to close and page to stabilize
    await page.waitForTimeout(5000);
    
    // Reload page to get fresh data
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check new balance
    const newBalanceText = await cashWalletElement.textContent();
    const newBalance = parseInt(newBalanceText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');
    console.log('New Cash Wallet balance:', newBalance);

    expect(newBalance).toBeGreaterThan(initialBalance);
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/test-income-transaction.png' });
  });

  test('Create EXPENSE transaction', async ({ page }) => {
    // Get initial balance
    const initialBalanceText = await page.locator('[class*="bg-slate-900"]').filter({ hasText: /Cash Wallet/i }).first().textContent();
    const initialBalance = parseInt(initialBalanceText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');

    // Open Quick Log drawer
    const fabButton = page.locator('button[aria-label="Add Transaction"]');
    await fabButton.click();
    await page.waitForSelector('text=Quick Log', { state: 'visible' });

    // EXPENSE is default, no need to select

    // Fill amount
    await page.locator('input[placeholder="0"]').fill('50000');

    // Select account
    await page.locator('select').first().selectOption({ index: 1 });

    // Fill description
    await page.locator('input[placeholder="What was this for?"]').fill('Test expense');

    // Submit
    await page.locator('button:has-text("Record Transaction")').click();
    await page.waitForTimeout(2000);

    // Check new balance (should be initial - 50000)
    const newBalanceText = await page.locator('[class*="bg-slate-900"]').filter({ hasText: /Cash Wallet/i }).first().textContent();
    const newBalance = parseInt(newBalanceText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');

    expect(newBalance).toBeLessThan(initialBalance);
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/test-expense-transaction.png' });
  });

  test('Create TRANSFER transaction', async ({ page }) => {
    // Get initial balances
    const bcaElement = page.locator('[class*="bg-slate-900"]').filter({ hasText: /BCA\b/i }).first();
    const gopayElement = page.locator('[class*="bg-slate-900"]').filter({ hasText: /GoPay/i }).first();
    
    const initialBcaText = await bcaElement.textContent();
    const initialGopayText = await gopayElement.textContent();
    
    const initialBca = parseInt(initialBcaText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');
    const initialGopay = parseInt(initialGopayText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');

    // Open Quick Log drawer
    const fabButton = page.locator('button[aria-label="Add Transaction"]');
    await fabButton.click();
    await page.waitForSelector('text=Quick Log', { state: 'visible' });

    // Select TRANSFER type
    await page.locator('button:has-text("TRANSFER")').click();
    await page.waitForTimeout(500);

    // Fill amount
    await page.locator('input[placeholder="0"]').fill('100000');

    // Select from account (BCA)
    const fromSelect = page.locator('select').first();
    await fromSelect.selectOption({ index: 1 }); // BCA
    await page.waitForTimeout(500);

    // Select to account (GoPay)
    const toSelect = page.locator('select').nth(1);
    await toSelect.selectOption({ index: 2 }); // GoPay
    await page.waitForTimeout(500);

    // Fill description
    await page.locator('input[placeholder="What was this for?"]').fill('Test transfer');

    // Submit
    await page.locator('button:has-text("Record Transaction")').click();
    await page.waitForTimeout(2000);

    // Check new balances
    const newBcaText = await bcaElement.textContent();
    const newGopayText = await gopayElement.textContent();
    
    const newBca = parseInt(newBcaText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');
    const newGopay = parseInt(newGopayText?.match(/Rp ([\d.]+)/)?.[1]?.replace(/\./g, '') || '0');

    // BCA should decrease, GoPay should increase
    expect(newBca).toBeLessThan(initialBca);
    expect(newGopay).toBeGreaterThan(initialGopay);
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/test-transfer-transaction.png' });
  });
});
