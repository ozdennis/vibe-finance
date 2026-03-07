import { test, expect } from '@playwright/test';

test.describe('Vibe Finance - Core Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('1. Dashboard loads with Net Liquidity Hero', async ({ page }) => {
    // Check Net Liquidity Hero is visible
    const heroSection = page.locator('section').filter({ hasText: /Net Liquidity/i }).first();
    await expect(heroSection).toBeVisible();
    
    // Check for "Real Money" or "You're in debt" text
    const realMoneyText = page.locator('text=/Real Money|You\'re in debt/i');
    await expect(realMoneyText).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/01-dashboard-hero.png' });
  });

  test('2. Account Grid displays with horizontal scroll', async ({ page }) => {
    const accountGrid = page.locator('.scrollbar-hide').first();
    await expect(accountGrid).toBeVisible();
    
    // Check accounts are visible
    const accounts = page.locator('[class*="bg-slate-900"]').filter({ hasText: /BCA|GoPay|OVO|Credit Card/i });
    await expect(accounts.first()).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/02-account-grid.png' });
  });

  test('3. Quick Log Drawer opens with FAB button', async ({ page }) => {
    // Find the floating action button
    const fabButton = page.locator('button[aria-label="Add Transaction"]');
    await expect(fabButton).toBeVisible();
    
    // Click to open drawer
    await fabButton.click();
    
    // Wait for drawer to open
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    
    // Check amount input is visible
    const amountInput = page.locator('input[placeholder="0"]');
    await expect(amountInput).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/03-quick-log-drawer.png' });
  });

  test('4. Transaction type selection works', async ({ page }) => {
    const fabButton = page.locator('button[aria-label="Add Transaction"]');
    await fabButton.click();
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    
    // Click INCOME button
    const incomeButton = page.locator('button:has-text("INCOME")');
    await incomeButton.click();
    await expect(incomeButton).toHaveClass(/bg-emerald-500/);
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/04-income-selected.png' });
  });

  test('5. Settings page loads with Accounts section', async ({ page }) => {
    // Click settings button
    const settingsButton = page.locator('a[href="/settings"]').first();
    await settingsButton.click();
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for client-side data fetching
    
    // Check Accounts section - use text content instead of h2
    const accountsSection = page.locator('text=Accounts').first();
    await expect(accountsSection).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/05-settings-accounts.png' });
  });

  test('6. Settings page - Categories section visible', async ({ page }) => {
    // Navigate to settings
    const settingsButton = page.locator('a[href="/settings"]').first();
    await settingsButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for client-side data fetching
    
    // Check Categories section
    const categoriesSection = page.locator('text=Categories').first();
    await expect(categoriesSection).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/06-settings-categories.png' });
  });

  test('7. Tax Projection card displays', async ({ page }) => {
    const taxSection = page.locator('text=Tax Projection').first();
    await expect(taxSection).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/07-tax-projection.png' });
  });

  test('8. Category Search in Quick Log', async ({ page }) => {
    const fabButton = page.locator('button[aria-label="Add Transaction"]');
    await fabButton.click();
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    
    // Click category search input
    const categoryInput = page.locator('input[placeholder*="Search category"]');
    await categoryInput.click();
    await categoryInput.fill('FO');
    
    // Wait for dropdown
    await page.waitForTimeout(1000);
    
    // Check dropdown appears
    const dropdown = page.locator('[class*="bg-slate-800"]').filter({ hasText: /FOOD/i }).first();
    await expect(dropdown).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/08-category-search.png' });
    
    // Close drawer
    await page.keyboard.press('Escape');
  });

  test('9. Add Account modal opens', async ({ page }) => {
    // Navigate to settings
    const settingsButton = page.locator('a[href="/settings"]').first();
    await settingsButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for client-side data fetching
    
    // Click Add Account button - use more specific selector
    const addAccountButton = page.locator('button:has-text("Add Account")').first();
    await expect(addAccountButton).toBeVisible();
    await addAccountButton.click();
    
    // Wait for modal
    await page.waitForSelector('text=New Account', { state: 'visible', timeout: 10000 });
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/09-add-account-modal.png' });
  });

  test('10. Receipt scan button visible', async ({ page }) => {
    const fabButton = page.locator('button[aria-label="Add Transaction"]');
    await fabButton.click();
    await page.waitForSelector('text=Quick Log', { state: 'visible' });
    
    // Check scan receipt button
    const scanButton = page.locator('button:has-text("Scan Receipt")');
    await expect(scanButton).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/10-receipt-scan-button.png' });
    
    // Close drawer
    await page.keyboard.press('Escape');
  });

  test('11. Transaction History displays with edit/delete buttons', async ({ page }) => {
    // Scroll down to transaction history
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    
    // Check transaction history is visible
    const transactionHistory = page.locator('text=Recent Transactions').first();
    await expect(transactionHistory).toBeVisible();
    
    // Check for edit/delete buttons on hover
    const transactionItem = page.locator('[class*="bg-slate-800/50"]').filter({ hasText: /Lunch|Gojek|Grocery/i }).first();
    await transactionItem.scrollIntoViewIfNeeded();
    await transactionItem.hover();
    
    // Check edit button is visible
    const editButton = transactionItem.locator('[aria-label="Edit transaction"]');
    await expect(editButton).toBeVisible();
    
    // Check delete button is visible
    const deleteButton = transactionItem.locator('[aria-label="Delete transaction"]');
    await expect(deleteButton).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/11-transaction-history.png' });
  });

  test('12. Transaction edit modal opens', async ({ page }) => {
    // Find a transaction and hover to reveal edit button
    const transactionItem = page.locator('[class*="bg-slate-800/50"]').filter({ hasText: /Lunch|Gojek|Grocery/i }).first();
    await transactionItem.hover();
    
    // Click edit button
    const editButton = transactionItem.locator('[aria-label="Edit transaction"]');
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Wait for modal
    await page.waitForSelector('text=Edit Transaction', { state: 'visible', timeout: 5000 });
    
    // Check form fields
    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/12-edit-transaction-modal.png' });
    
    // Close modal
    const closeButton = page.locator('[aria-label="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('13. Monthly Trend Chart displays', async ({ page }) => {
    const trendSection = page.locator('text=Monthly Trend').first();
    await expect(trendSection).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/13-monthly-trend-chart.png' });
  });
});
