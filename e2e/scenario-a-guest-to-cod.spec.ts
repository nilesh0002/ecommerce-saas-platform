import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SCREENSHOTS_DIR, uniqueEmail } from './helpers/test-utils';

test.describe('Scenario A: Guest adds to cart, registers, and checks out with COD', () => {
  test('guest successfully completes end-to-end COD purchase', async ({ page }) => {
    // 1. Visit catalog / product page as an unauthenticated guest
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    // Click on the active product card with inventory
    const targetProduct = page.locator('a[href*="acme-wireless-headphones"]').first();
    if (await targetProduct.isVisible()) {
      await targetProduct.click();
    } else {
      await page.goto('/product/acme-wireless-headphones');
    }

    // 2. Add product to cart
    await page.waitForURL(/\/product\/.+/);
    const addToCartBtn = page.locator('button:has-text("Add to Bag")');
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();
    await page.waitForSelector('text=Added to Shopping Bag!');

    // 3. Navigate to Register via header link (SPA navigation preserves guest cart)
    const email = uniqueEmail('guest-cod');
    await page.locator('header a[href="/register"]').click();
    await page.waitForURL(/\/register/);

    await page.fill('input[placeholder*="Nilesh"], input[placeholder*="First"]', 'Jane');
    await page.fill('input[placeholder*="Singh"], input[placeholder*="Last"]', 'Doe');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]:has-text("Create Account")');

    // Wait for redirect to profile
    await page.waitForURL(/\/(profile|$)/);

    // 4. Navigate to Addresses and add delivery address
    await page.locator('a[href="/addresses"]').first().click();
    await page.waitForURL(/\/addresses/);

    await page.locator('a[href="/addresses/new"]').first().click();
    await page.waitForURL(/\/addresses\/new/);

    await page.fill('input[placeholder*="FullName"]', 'Jane Doe');
    await page.fill('input[placeholder*="Line1"]', '456 MG Road');
    await page.fill('input[placeholder*="City"]', 'Bengaluru');
    await page.fill('input[placeholder*="State"]', 'Karnataka');
    await page.fill('input[placeholder*="PostalCode"]', '560001');
    await page.fill('input[placeholder*="Phone"]', '9876543210');
    await page.click('button:has-text("Save address")');

    await page.waitForURL((url) => url.pathname === '/addresses');
    await expect(page.locator('text=456 MG Road')).toBeVisible();

    // 5. Navigate to Cart and Checkout
    await page.locator('header a[href="/cart"]').click();
    await page.waitForURL(/\/cart/);

    await page.locator('a[href="/checkout"]').first().click();
    await page.waitForURL(/\/checkout/);

    // Ensure COD is selected
    const codRadio = page.locator('input[type="radio"][name="payment_method"]').first();
    await codRadio.check();

    // Click "Place Order Now"
    const placeOrderBtn = page.locator('button:has-text("Place Order Now")');
    await expect(placeOrderBtn).toBeEnabled({ timeout: 10_000 });
    await placeOrderBtn.click();

    // 6. Verify landing on order confirmation page with CONFIRMED status
    await page.waitForURL(/\/orders\/.+/, { timeout: 15_000 });
    await expect(page.locator('text=CONFIRMED').first()).toBeVisible();

    // Save milestone screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'scenario-a-order-confirmed.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(page.url()).toContain('/orders/');
  });
});
