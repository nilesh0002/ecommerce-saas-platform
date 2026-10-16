import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SCREENSHOTS_DIR, uniqueEmail } from './helpers/test-utils';
import { createLimitedStockProduct, createTestUser } from './helpers/db';

test.describe('Scenario C: Concurrency race condition for the last stock unit', () => {
  test('two browser contexts race for the last unit; exactly one succeeds and the other fails', async ({ browser }) => {
    // 1. Seed product with quantity exactly 1
    const sku = `RACE-${Date.now()}`;
    const { product } = await createLimitedStockProduct(sku, 1);

    // 2. Create two distinct user accounts with addresses
    const userA = await createTestUser(uniqueEmail('buyer-a'));
    const userB = await createTestUser(uniqueEmail('buyer-b'));

    // 3. Create two independent browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Log in Buyer A
    await pageA.goto('/login');
    await pageA.fill('input[type="email"]', userA.user.email);
    await pageA.fill('input[type="password"]', 'Password123!');
    await pageA.click('button[type="submit"]:has-text("Sign in")');
    await pageA.waitForURL(/\/(profile|$)/);

    // Log in Buyer B
    await pageB.goto('/login');
    await pageB.fill('input[type="email"]', userB.user.email);
    await pageB.fill('input[type="password"]', 'Password123!');
    await pageB.click('button[type="submit"]:has-text("Sign in")');
    await pageB.waitForURL(/\/(profile|$)/);

    // Both navigate to the product page
    await Promise.all([
      pageA.goto(`/product/${product.slug}`),
      pageB.goto(`/product/${product.slug}`),
    ]);

    // Both click Add to Bag and wait for confirmation
    await pageA.locator('button:has-text("Add to Bag")').click();
    await pageA.waitForSelector('text=Added to Shopping Bag!');

    await pageB.locator('button:has-text("Add to Bag")').click();
    await pageB.waitForSelector('text=Added to Shopping Bag!');

    // Both go to checkout
    await Promise.all([
      pageA.goto('/checkout'),
      pageB.goto('/checkout'),
    ]);

    const btnA = pageA.locator('button:has-text("Place Order Now")');
    const btnB = pageB.locator('button:has-text("Place Order Now")');

    // Wait until both checkout buttons are enabled
    await Promise.all([
      expect(btnA).toBeEnabled({ timeout: 10_000 }),
      expect(btnB).toBeEnabled({ timeout: 10_000 }),
    ]);

    // Both click Place Order Now concurrently
    await Promise.all([
      btnA.click(),
      btnB.click(),
    ]);

    // Wait for resolution
    await Promise.allSettled([
      pageA.waitForURL(/\/orders\/.+/, { timeout: 10_000 }),
      pageB.waitForURL(/\/orders\/.+/, { timeout: 10_000 }),
    ]);

    const aUrl = pageA.url();
    const bUrl = pageB.url();

    const aSucceeded = aUrl.includes('/orders/');
    const bSucceeded = bUrl.includes('/orders/');

    // Assert that exactly one customer succeeded and the other was rejected
    expect(aSucceeded !== bSucceeded).toBe(true);

    const winnerPage = aSucceeded ? pageA : pageB;
    const loserPage = aSucceeded ? pageB : pageA;

    await winnerPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'scenario-c-winner.png'), fullPage: true });
    await loserPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'scenario-c-out-of-stock.png'), fullPage: true });

    await expect(winnerPage.locator('text=CONFIRMED').first()).toBeVisible();
    await expect(loserPage.locator('.text-red-600').or(loserPage.getByText(/stock|error/i)).first()).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });
});
