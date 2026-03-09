import { test, expect } from '@playwright/test';

test.describe('Vibe Finance - Stage 3 Features', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // Test 1: Calendar URL params parsing (canonical, legacy, invalid fallback)
  test('1. Month picker navigation syncs with URL', async ({ page }) => {
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const now = new Date();
    const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

    // Canonical format works
    await page.goto('/?month=02&year=2026');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/month=02&year=2026/);
    await expect(page.locator('button[aria-label="Reset to current month"]')).toContainText('February 2026');
    await page.screenshot({ path: 'tests/screenshots/stage3-01-month-picker.png' });

    // Legacy format month=2 is still accepted for read compatibility
    await page.goto('/?month=2&year=2026');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button[aria-label="Reset to current month"]')).toContainText('February 2026');

    // Invalid params fallback to current period safely
    await page.goto('/?month=13&year=abcd');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button[aria-label="Current month"]')).toContainText(currentMonthLabel);
    await page.screenshot({ path: 'tests/screenshots/stage3-02-month-navigation.png' });
  });

  // Test 2: Dual Hero Metrics
  test('2. Dual hero metrics display (Net Liquidity + Total Net Worth)', async ({ page }) => {
    // Check Net Liquidity (primary metric) is visible
    const netLiquidityLabel = page.locator('text=Net Liquidity').first();
    await expect(netLiquidityLabel).toBeVisible();

    // Check Total Net Worth (secondary metric) is visible
    const netWorthLabel = page.locator('text=Total Net Worth').first();
    await expect(netWorthLabel).toBeVisible();

    // Screenshot showing both metrics
    await page.screenshot({ path: 'tests/screenshots/stage3-03-dual-hero-metrics.png' });

    // Verify Net Liquidity value is displayed prominently
    const netLiquidityValue = page.locator('[class*="text-emerald-400"]').filter({ hasText: /Rp/i }).first();
    await expect(netLiquidityValue).toBeVisible();
  });

  // Test 3: Investment Shelf Visibility
  test('3. Investment shelf displays with Flow/Interest/Total MTD', async ({ page }) => {
    // Check if Investment Shelf section exists (may be empty if no investments)
    const investmentShelf = page.locator('text=Investment Shelf').first();

    // Take screenshot regardless - shows either shelf or absence
    await page.screenshot({ path: 'tests/screenshots/stage3-04-investment-shelf.png' });

    // If investments exist, verify MTD metrics display
    if (await investmentShelf.isVisible()) {
      // Check for Flow/Interest/Total badges (new UI shows three metrics)
      const flowBadges = page.locator('[class*="bg-emerald-500/10"], [class*="bg-rose-500/10"]').filter({ hasText: /Flow/i });
      const interestBadges = page.locator('[class*="bg-emerald-500/10"], [class*="bg-zinc-500/10"]').filter({ hasText: /Interest/i });
      const totalBadges = page.locator('[class*="bg-indigo-500/10"], [class*="bg-rose-500/10"]').filter({ hasText: /Total/i });
      
      const flowCount = await flowBadges.count();
      const interestCount = await interestBadges.count();
      const totalCount = await totalBadges.count();

      // At least one metric badge should exist if shelf is visible
      const totalCounts = flowCount + interestCount + totalCount;
      expect(totalCounts).toBeGreaterThan(0);

      // Screenshot with MTD badges highlighted
      await page.screenshot({ path: 'tests/screenshots/stage3-05-mtd-growth.png' });
    }
  });

  // Test 4: Investment accounts excluded from AccountGrid
  test('4. Investment accounts only appear in Investment Shelf, not Account Grid', async ({ page }) => {
    // Navigate to settings to check account types
    const settingsButton = page.locator('a[href="/settings"]').first();
    await settingsButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if there are INVESTMENT type accounts
    const investmentAccounts = page.locator('text=INVESTMENT').first();
    const hasInvestments = await investmentAccounts.isVisible();

    // Return to dashboard directly to avoid reliance on settings-page nav markup.
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/stage3-06-account-grid.png' });

    // If investments exist, verify they're in Investment Shelf section
    if (hasInvestments) {
      const investmentShelf = page.locator('text=Investment Shelf').first();
      await expect(investmentShelf).toBeVisible();
    }
  });

  // Test 5: Sync Balance Modal Flow
  test('5. Sync Balance modal opens from Settings', async ({ page }) => {
    // Navigate to settings
    const settingsButton = page.locator('a[href="/settings"]').first();
    await settingsButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find and click the Sync Balance button (RefreshCw icon)
    const syncButton = page.locator('button[aria-label*="Sync balance"]').first();
    
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(500);

      // Check modal is visible
      const syncModal = page.locator('text=Sync Balance').first();
      await expect(syncModal).toBeVisible();

      // Check modal elements
      const actualBalanceInput = page.locator('input[placeholder="0"]').first();
      await expect(actualBalanceInput).toBeVisible();

      const effectiveDateInput = page.locator('input[type="date"]').first();
      await expect(effectiveDateInput).toBeVisible();

      // Screenshot
      await page.screenshot({ path: 'tests/screenshots/stage3-07-sync-balance-modal.png' });

      // Close modal
      const closeButton = page.locator('button[aria-label="Close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    } else {
      // No accounts to sync - take screenshot of accounts list
      await page.screenshot({ path: 'tests/screenshots/stage3-07-no-accounts-to-sync.png' });
    }
  });

  // Test 6: Sync Balance Form Validation
  test('6. Sync Balance form validation and submission', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find and click the Sync Balance button
    const syncButton = page.locator('button[aria-label*="Sync balance"]').first();
    
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(500);

      // Try to submit without filling actual balance
      const submitButton = page.locator('button[type="submit"]').first();
      
      // Button should be disabled when actual balance is empty
      await expect(submitButton).toBeDisabled();

      // Fill in actual balance
      const actualBalanceInput = page.locator('input[placeholder="0"]').first();
      await actualBalanceInput.fill('1000000');

      // Button should now be enabled
      await expect(submitButton).toBeEnabled();

      // Screenshot before submission
      await page.screenshot({ path: 'tests/screenshots/stage3-08-sync-balance-filled.png' });

      // Note: Not actually submitting to avoid modifying test data
      // Close modal instead
      const closeButton = page.locator('button[aria-label="Close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  // Test 7: Month Picker Current Month Highlight
  test('7. Current month highlighted differently from historical months', async ({ page }) => {
    // Check current month display (should be highlighted as current)
    const currentMonthButton = page.locator('button[aria-label="Current month"]').first();
    
    if (await currentMonthButton.isVisible()) {
      // Current month should have different styling
      await expect(currentMonthButton).toHaveClass(/bg-zinc-800/);
      
      // Screenshot
      await page.screenshot({ path: 'tests/screenshots/stage3-09-current-month-highlight.png' });
    } else {
      // Historical month view - "Historical View" label should be visible
      const historicalLabel = page.locator('text=Historical View').first();
      await expect(historicalLabel).toBeVisible();
      
      // Screenshot
      await page.screenshot({ path: 'tests/screenshots/stage3-09-historical-view.png' });
    }
  });

  // Test 8: Responsive Design - Mobile View
  test('8. Month picker responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // Check month picker is visible and functional
    const prevButton = page.locator('button[aria-label="Previous month"]').first();
    const nextButton = page.locator('button[aria-label="Next month"]').first();
    
    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    // Screenshot mobile view
    await page.screenshot({ path: 'tests/screenshots/stage3-10-mobile-month-picker.png' });

    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  // Test 9: Investment Shelf Horizontal Scroll
  test('9. Investment shelf horizontal scrolling', async ({ page }) => {
    // Check if investment shelf exists
    const investmentShelf = page.locator('text=Investment Shelf').first();
    
    if (await investmentShelf.isVisible()) {
      // Find the scrollable container
      const scrollContainer = page.locator('[class*="overflow-x-auto"]').filter({ has: page.locator('text=Investment Shelf') }).first();
      
      if (await scrollContainer.isVisible()) {
        // Get scrollable width
        const scrollWidth = await scrollContainer.evaluate((el) => el.scrollWidth);
        const clientWidth = await scrollContainer.evaluate((el) => el.clientWidth);

        // If scrollWidth > clientWidth, horizontal scroll is available
        if (scrollWidth > clientWidth) {
          // Scroll to the right
          await scrollContainer.evaluate((el) => {
            el.scrollTo({ left: 200, behavior: 'smooth' });
          });
          await page.waitForTimeout(500);

          // Screenshot after scroll
          await page.screenshot({ path: 'tests/screenshots/stage3-11-investment-shelf-scrolled.png' });
        }
      }
    }
  });

  // Test 10: Full Dashboard with Period Filter
  test('10. Full dashboard with period filter applied', async ({ page }) => {
    // Navigate with period params
    const now = new Date();
    const prevMonth = now.getMonth(); // 0-indexed
    const year = now.getFullYear();
    
    await page.goto(`/?month=${prevMonth}&year=${year}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify all sections are visible
    const netLiquidityHero = page.locator('text=Net Liquidity').first();
    const netWorthLabel = page.locator('text=Total Net Worth').first();
    const accountGrid = page.locator('text=Cash & Bank Accounts').first();
    
    await expect(netLiquidityHero).toBeVisible();
    await expect(netWorthLabel).toBeVisible();
    await expect(accountGrid).toBeVisible();

    // Screenshot full dashboard with period
    await page.screenshot({ path: 'tests/screenshots/stage3-12-full-dashboard-period.png', fullPage: true });
  });
});
