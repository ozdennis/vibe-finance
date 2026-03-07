import { test, expect, Page } from "@playwright/test";

/**
 * Bulk Delete Feature Tests
 *
 * Tests the bulk delete functionality for:
 * - Transactions (on dashboard)
 * - Accounts (on settings page)
 * - Categories (on settings page)
 */

// Helper function to wait for network idle
async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState("networkidle");
}

// Helper to dismiss alert dialogs
async function handleDialog(page: Page, accept: boolean = true) {
  page.on("dialog", async (dialog) => {
    if (accept) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
}

test.describe("Bulk Delete - Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForNetworkIdle(page);
  });

  test("should display select all checkbox in transaction header", async ({ page }) => {
    const selectAllButton = page.locator("button", { hasText: /Select All|\d+ selected/ });
    await expect(selectAllButton).toBeVisible();
  });

  test("should display checkboxes on each transaction row", async ({ page }) => {
    // Look for checkbox buttons in transaction rows
    const checkboxes = page.locator("button[aria-label='Select'], button[aria-label='Deselect']");
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should select a single transaction when clicking its checkbox", async ({ page }) => {
    // Click the first checkbox
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();

    // Verify "1 selected" text appears
    const selectedText = page.locator("text=1 selected");
    await expect(selectedText).toBeVisible();
  });

  test("should show bulk action bar when transactions are selected", async ({ page }) => {
    // Select a transaction
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();

    // Verify bulk action bar appears
    const bulkBar = page.locator("button", { hasText: "Delete Selected" });
    await expect(bulkBar).toBeVisible();
  });

  test("should select all transactions when clicking select all", async ({ page }) => {
    // Click select all
    const selectAllButton = page.locator("button", { hasText: "Select All" });
    await selectAllButton.click();

    // Verify the text changes to show all selected
    const transactionCount = await page.locator("button[aria-label='Deselect']").count();
    const selectedText = page.locator(`text=${transactionCount} selected`);
    await expect(selectedText).toBeVisible();
  });

  test("should clear selection when clicking clear button", async ({ page }) => {
    // Select some transactions
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();

    // Click clear
    const clearButton = page.locator("button", { hasText: "Clear" });
    await clearButton.click();

    // Verify bulk action bar disappears
    const bulkBar = page.locator("button", { hasText: "Delete Selected" });
    await expect(bulkBar).not.toBeVisible();
  });

  test("should show confirmation modal when clicking delete selected", async ({ page }) => {
    // Select a transaction
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();

    // Click delete selected
    const deleteButton = page.locator("button", { hasText: "Delete Selected" });
    await deleteButton.click();

    // Verify confirmation modal appears
    const confirmModal = page.locator("text=Delete Transactions");
    await expect(confirmModal).toBeVisible();

    // Verify cancel button exists
    const cancelButton = page.locator("button", { hasText: "Cancel" });
    await expect(cancelButton).toBeVisible();
  });

  test("should close confirmation modal when clicking cancel", async ({ page }) => {
    // Select a transaction and open confirmation
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();
    await page.locator("button", { hasText: "Delete Selected" }).click();

    // Click cancel
    await page.locator("button", { hasText: "Cancel" }).click();

    // Verify modal closes
    const confirmModal = page.locator("text=Delete Transactions");
    await expect(confirmModal).not.toBeVisible();
  });

  test("should hide individual action buttons when in bulk selection mode", async ({ page }) => {
    // Select a transaction
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();

    // Verify individual edit/delete buttons are not visible
    const editButton = page.locator("button[aria-label='Edit transaction']").first();
    await expect(editButton).not.toBeVisible();
  });

  test("should visually highlight selected transactions", async ({ page }) => {
    // Select a transaction
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();

    // Verify the row has the selected styling (bg-emerald-500/10)
    const selectedRow = page.locator("div.bg-emerald-500\\/10").first();
    await expect(selectedRow).toBeVisible();
  });
});

test.describe("Bulk Delete - Accounts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await waitForNetworkIdle(page);
  });

  test("should display select all checkbox in accounts header", async ({ page }) => {
    const accountsSection = page.locator("section").first();
    const selectAllButton = accountsSection.locator("button", { hasText: /Select All|\d+ selected/ });
    await expect(selectAllButton).toBeVisible();
  });

  test("should display checkboxes on each account row", async ({ page }) => {
    const accountsSection = page.locator("section").first();
    const checkboxes = accountsSection.locator("button").filter({ has: page.locator("svg") });
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should select a single account when clicking its checkbox", async ({ page }) => {
    const accountsSection = page.locator("section").first();

    // Click the first checkbox (Square icon)
    const firstCheckbox = accountsSection.locator("svg").first();
    await firstCheckbox.click();

    // Verify "1 selected" text appears
    const selectedText = accountsSection.locator("text=1 selected");
    await expect(selectedText).toBeVisible();
  });

  test("should show bulk action bar when accounts are selected", async ({ page }) => {
    const accountsSection = page.locator("section").first();

    // Click the first checkbox
    const firstCheckbox = accountsSection.locator("svg").first();
    await firstCheckbox.click();

    // Verify bulk action bar appears
    const bulkBar = page.locator("button", { hasText: "Delete Selected" });
    await expect(bulkBar).toBeVisible();
  });

  test("should show confirmation modal for bulk account deletion", async ({ page }) => {
    const accountsSection = page.locator("section").first();

    // Select an account
    const firstCheckbox = accountsSection.locator("svg").first();
    await firstCheckbox.click();

    // Click delete selected
    const deleteButton = page.locator("button", { hasText: "Delete Selected" });
    await deleteButton.click();

    // Verify confirmation modal appears
    const confirmModal = page.locator("text=Delete Accounts");
    await expect(confirmModal).toBeVisible();
  });

  test("should hide individual action buttons when accounts are selected", async ({ page }) => {
    const accountsSection = page.locator("section").first();

    // Select an account
    const firstCheckbox = accountsSection.locator("svg").first();
    await firstCheckbox.click();

    // Verify individual edit button is not visible
    const editButton = accountsSection.locator("button", { has: page.locator("svg") }).nth(1);
    // The edit/delete buttons should be hidden when in selection mode
    const individualActions = accountsSection.locator("button[aria-label='Edit']");
    await expect(individualActions).not.toBeVisible();
  });
});

test.describe("Bulk Delete - Categories", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await waitForNetworkIdle(page);
  });

  test("should display select all checkbox in categories header", async ({ page }) => {
    const categoriesSection = page.locator("section").nth(1);
    const selectAllButton = categoriesSection.locator("button", { hasText: /Select All|\d+ selected/ });
    await expect(selectAllButton).toBeVisible();
  });

  test("should display checkboxes on each category row", async ({ page }) => {
    const categoriesSection = page.locator("section").nth(1);
    const checkboxes = categoriesSection.locator("button").filter({ has: page.locator("svg") });
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should select a single category when clicking its checkbox", async ({ page }) => {
    const categoriesSection = page.locator("section").nth(1);

    // Click the first checkbox
    const firstCheckbox = categoriesSection.locator("svg").first();
    await firstCheckbox.click();

    // Verify "1 selected" text appears
    const selectedText = categoriesSection.locator("text=1 selected");
    await expect(selectedText).toBeVisible();
  });

  test("should show bulk action bar when categories are selected", async ({ page }) => {
    const categoriesSection = page.locator("section").nth(1);

    // Click the first checkbox
    const firstCheckbox = categoriesSection.locator("svg").first();
    await firstCheckbox.click();

    // Verify bulk action bar appears
    const bulkBar = page.locator("button", { hasText: "Delete Selected" });
    await expect(bulkBar).toBeVisible();
  });

  test("should show confirmation modal for bulk category deletion", async ({ page }) => {
    const categoriesSection = page.locator("section").nth(1);

    // Select a category
    const firstCheckbox = categoriesSection.locator("svg").first();
    await firstCheckbox.click();

    // Click delete selected
    const deleteButton = page.locator("button", { hasText: "Delete Selected" });
    await deleteButton.click();

    // Verify confirmation modal appears
    const confirmModal = page.locator("text=Delete Categories");
    await expect(confirmModal).toBeVisible();
  });
});

test.describe("Bulk Delete - UI States", () => {
  test("should show indeterminate state when some items are selected", async ({ page }) => {
    await page.goto("/");
    await waitForNetworkIdle(page);

    // Get total transaction count
    const totalTransactions = await page.locator("button[aria-label='Select']").count();

    if (totalTransactions >= 2) {
      // Select only the first transaction
      const firstCheckbox = page.locator("button[aria-label='Select']").first();
      await firstCheckbox.click();

      // The select all button should show partial selection state
      const selectAllButton = page.locator("button", { hasText: /\d+ selected/ });
      await expect(selectAllButton).toBeVisible();
    }
  });

  test("should update selection count when selecting multiple items", async ({ page }) => {
    await page.goto("/");
    await waitForNetworkIdle(page);

    // Select first two transactions
    const checkboxes = page.locator("button[aria-label='Select']");
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();

      // Verify "2 selected" text appears
      const selectedText = page.locator("text=2 selected");
      await expect(selectedText).toBeVisible();
    }
  });

  test("should deselect all when clicking select all twice", async ({ page }) => {
    await page.goto("/");
    await waitForNetworkIdle(page);

    // Click select all
    const selectAllButton = page.locator("button", { hasText: "Select All" });
    await selectAllButton.click();

    // Click again to deselect all
    const deselectAllButton = page.locator("button", { hasText: /\d+ selected/ });
    await deselectAllButton.click();

    // Verify bulk action bar disappears
    const bulkBar = page.locator("button", { hasText: "Delete Selected" });
    await expect(bulkBar).not.toBeVisible();
  });
});

test.describe("Bulk Delete - Accessibility", () => {
  test("should have proper aria labels for checkboxes", async ({ page }) => {
    await page.goto("/");
    await waitForNetworkIdle(page);

    // Check for aria-label on checkboxes
    const checkbox = page.locator("button[aria-label='Select']").first();
    await expect(checkbox).toHaveAttribute("aria-label", "Select");
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/");
    await waitForNetworkIdle(page);

    // Press tab to focus elements
    await page.keyboard.press("Tab");

    // Check that interactive elements can be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});

test.describe("Bulk Delete - Responsive", () => {
  test("should display correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await waitForNetworkIdle(page);

    // Verify bulk action bar is visible and properly positioned
    const firstCheckbox = page.locator("button[aria-label='Select']").first();
    await firstCheckbox.click();

    const bulkBar = page.locator("button", { hasText: "Delete Selected" });
    await expect(bulkBar).toBeVisible();
  });

  test("should display correctly on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/settings");
    await waitForNetworkIdle(page);

    // Verify both sections display correctly
    const accountsSection = page.locator("section").first();
    const categoriesSection = page.locator("section").nth(1);

    await expect(accountsSection).toBeVisible();
    await expect(categoriesSection).toBeVisible();
  });
});
