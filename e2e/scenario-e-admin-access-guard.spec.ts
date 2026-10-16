import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SCREENSHOTS_DIR, uniqueEmail } from './helpers/test-utils';
import { createTestUser } from './helpers/db';

test.describe('Scenario E: Customer access guard blocks non-staff users from /admin', () => {
  test('customer role is prohibited from accessing admin studio routes', async ({ page }) => {
    // 1. Create and log in as regular customer
    const customer = await createTestUser(uniqueEmail('customer-blocked'));

    await page.goto('/login');
    await page.fill('input[type="email"]', customer.user.email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign in")');
    await page.waitForURL(/\/(profile|$)/);

    // 2. Direct navigation to /admin
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Verify access denied UI
    await expect(page.locator('text=Admin access required').first()).toBeVisible();
    await expect(page.locator('text=Sign in with an authorized staff account').first()).toBeVisible();

    // Verify no staff navigation links are rendered
    await expect(page.locator('a[href="/admin/products"]')).not.toBeVisible();
    await expect(page.locator('a[href="/admin/orders"]')).not.toBeVisible();

    // 3. Attempt direct access to nested /admin/orders
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Admin access required').first()).toBeVisible();

    // Save screenshot of the access blocked screen
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'scenario-e-admin-blocked.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
  });
});
