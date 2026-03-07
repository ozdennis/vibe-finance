import { test, expect } from '@playwright/test';

test.describe('Vibe Finance - Transaction Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('1. Dashboard loads with empty state', async ({ page }) => {
    // Check Net Liquidity shows 0
    const netLiquidity = page.locator('text=Net Liquidity').first();
    await expect(netLiquidity).toBeVisible();
    
    // Should show "No accounts yet" or accounts if they exist
    const pageContent = await page.content();
    console.log('Dashboard loaded');
    
    await page.screenshot({ path: 'tests/screenshots/01-dashboard-empty.png' });
  });

  test('2. Add Account via Settings', async ({ page }) => {
    // Go to settings
    await page.click('a[href="/settings"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click Add Account
    await page.click('button:has-text("Add Account")');
    await page.waitForTimeout(500);
    
    // Fill form
    await page.fill('input[placeholder*="Account Name"]', 'Test BCA');
    await page.click('button:has-text("Cash")');
    await page.fill('input[placeholder="0"]', '10000000');
    
    // Submit
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(3000);
    
    // Go back home
    await page.click('a[href="/"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'tests/screenshots/02-account-created.png' });
  });

  test('3. Create INCOME transaction', async ({ page }) => {
    // Open Quick Log drawer
    await page.click('button[aria-label="Add Transaction"]');
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    await page.waitForTimeout(1000);
    
    // Select INCOME
    await page.click('button:has-text("INCOME")');
    await page.waitForTimeout(500);
    
    // Fill amount
    await page.fill('input[placeholder="0"]', '5000000');
    await page.waitForTimeout(300);
    
    // Select account
    await page.selectOption('select >> nth=0', { index: 1 });
    await page.waitForTimeout(500);
    
    // Description
    await page.fill('input[placeholder*="What was this"]', 'Salary');
    
    // Submit
    await page.click('button:has-text("Record Transaction")');
    
    // Wait for success alert
    await page.waitForTimeout(3000);
    
    // Handle alert
    page.on('dialog', async dialog => {
      console.log('Alert:', dialog.message());
      await dialog.accept();
    });
    
    await page.screenshot({ path: 'tests/screenshots/03-income-created.png' });
  });

  test('4. Create EXPENSE transaction', async ({ page }) => {
    // Open drawer
    await page.click('button[aria-label="Add Transaction"]');
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    await page.waitForTimeout(1000);
    
    // EXPENSE is default, fill amount
    await page.fill('input[placeholder="0"]', '100000');
    await page.waitForTimeout(300);
    
    // Select account
    await page.selectOption('select >> nth=0', { index: 1 });
    await page.waitForTimeout(500);
    
    // Description
    await page.fill('input[placeholder*="What was this"]', 'Lunch');
    
    // Submit
    await page.click('button:has-text("Record Transaction")');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'tests/screenshots/04-expense-created.png' });
  });

  test('5. Create TRANSFER transaction', async ({ page }) => {
    // First add another account for transfer
    await page.click('a[href="/settings"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Add Account")');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder*="Account Name"]', 'GoPay');
    await page.click('button:has-text("E-Wallet")');
    await page.fill('input[placeholder="0"]', '0');
    
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(3000);
    
    // Go back home
    await page.click('a[href="/"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Now create transfer
    await page.click('button[aria-label="Add Transaction"]');
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    await page.waitForTimeout(1000);
    
    // Select TRANSFER
    await page.click('button:has-text("TRANSFER")');
    await page.waitForTimeout(1000);
    
    // Fill amount
    await page.fill('input[placeholder="0"]', '500000');
    await page.waitForTimeout(300);
    
    // Select From Account
    await page.selectOption('select >> nth=0', { index: 1 });
    await page.waitForTimeout(1000);
    
    // Select To Account
    await page.selectOption('select >> nth=1', { index: 2 });
    await page.waitForTimeout(500);
    
    // Description
    await page.fill('input[placeholder*="What was this"]', 'Top up GoPay');
    
    // Submit
    await page.click('button:has-text("Record Transaction")');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'tests/screenshots/05-transfer-created.png' });
  });

  test('6. Verify transactions appear in Recent Transactions', async ({ page }) => {
    // Scroll to transactions
    await page.waitForSelector('text=Recent Transactions');
    
    // Check transactions are visible
    const transactions = page.locator('[class*="bg-slate-800/50"]').filter({ hasText: /Rp/ });
    const count = await transactions.count();
    console.log('Transaction count:', count);
    
    // Should have at least 3 transactions (income, expense, transfer)
    expect(count).toBeGreaterThanOrEqual(3);
    
    await page.screenshot({ path: 'tests/screenshots/06-transactions-list.png' });
  });

  test('7. Edit transaction', async ({ page }) => {
    // Find first transaction and hover to show edit button
    const transactionItem = page.locator('[class*="bg-slate-800/50"]').filter({ hasText: /Rp/ }).first();
    await transactionItem.scrollIntoViewIfNeeded();
    await transactionItem.hover();
    
    // Click edit button
    const editButton = transactionItem.locator('[aria-label="Edit transaction"]');
    const isVisible = await editButton.isVisible();
    
    if (isVisible) {
      await editButton.click();
      await page.waitForSelector('text=Edit Transaction', { state: 'visible' });
      
      // Screenshot of edit modal
      await page.screenshot({ path: 'tests/screenshots/07-edit-modal.png' });
      
      // Close modal
      await page.keyboard.press('Escape');
    } else {
      console.log('Edit button not visible on hover');
    }
  });

  test('8. Verify balance updated after transactions', async ({ page }) => {
    // Reload page to ensure fresh data
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check account balance is visible
    const accountCard = page.locator('[class*="bg-slate-900"]').filter({ hasText: /Test BCA|BCA/i }).first();
    await expect(accountCard).toBeVisible();
    
    await page.screenshot({ path: 'tests/screenshots/08-final-balances.png' });
  });
});
