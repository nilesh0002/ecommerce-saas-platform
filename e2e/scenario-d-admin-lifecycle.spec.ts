import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SCREENSHOTS_DIR, uniqueEmail } from './helpers/test-utils';
import { createTestUser, prisma } from './helpers/db';

test.describe('Scenario D: Admin product creation and order status updates', () => {
  test('admin creates a product, customer purchases it, admin updates status to SHIPPED, customer sees update', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const customerContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const customerPage = await customerContext.newPage();

    // 1. Admin login
    await adminPage.goto('/login');
    await adminPage.fill('input[type="email"]', 'admin@example.com');
    await adminPage.fill('input[type="password"]', 'ChangeMe123!');
    await adminPage.click('button[type="submit"]:has-text("Sign in")');
    await adminPage.waitForURL(/\/(profile|admin|$)/);

    // 2. Admin navigates to /admin/products and creates a category and product
    await adminPage.goto('/admin/products');
    await adminPage.waitForLoadState('networkidle');

    const suffix = Date.now().toString().slice(-6);
    const catName = `Category ${suffix}`;
    const catSlug = `cat-${suffix}`;

    // Fill category form
    const newCatForm = adminPage.locator('form:has-text("New category")');
    await newCatForm.locator('input[placeholder="Name"]').fill(catName);
    await newCatForm.locator('input[placeholder="slug"]').fill(catSlug);
    await newCatForm.locator('button:has-text("Create category")').click();

    await adminPage.waitForTimeout(1000);

    // Fill product form
    const prodName = `Admin Product ${suffix}`;
    const prodSlug = `prod-${suffix}`;

    const newProdForm = adminPage.locator('form:has-text("New product")');
    await newProdForm.locator('input[placeholder="Name"]').fill(prodName);
    await newProdForm.locator('input[placeholder="slug"]').fill(prodSlug);
    await newProdForm.locator('select').selectOption({ label: catName });
    await newProdForm.locator('input[placeholder="Description"]').fill('High-quality product created by admin in studio.');
    await newProdForm.locator('button:has-text("Create product")').click();

    await adminPage.waitForTimeout(1500);

    // Provide variant inventory for customer purchasing
    const createdProduct = await prisma.product.findUniqueOrThrow({ where: { slug: prodSlug } });
    await prisma.productVariant.create({
      data: {
        productId: createdProduct.id,
        name: 'Default',
        sku: `SKU-${suffix}`,
        pricePaise: 299900,
        inventory: { create: { quantity: 15, lowStockAt: 2 } },
      },
    });

    // Admin screenshot of created product
    await adminPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'scenario-d-admin-product-created.png'),
      fullPage: true,
    });

    // 3. Customer logs in and visits the created product page
    const customerUser = await createTestUser(uniqueEmail('customer-d'));
    await customerPage.goto('/login');
    await customerPage.fill('input[type="email"]', customerUser.user.email);
    await customerPage.fill('input[type="password"]', 'Password123!');
    await customerPage.click('button[type="submit"]:has-text("Sign in")');
    await customerPage.waitForURL(/\/(profile|$)/);

    // Customer navigates to the newly created product
    await customerPage.goto(`/product/${prodSlug}`);
    await customerPage.waitForLoadState('networkidle');

    await customerPage.locator('button:has-text("Add to Bag")').click();
    await customerPage.waitForSelector('text=Added to Shopping Bag!');

    await customerPage.goto('/checkout');
    await customerPage.waitForLoadState('networkidle');

    const placeOrderBtn = customerPage.locator('button:has-text("Place Order Now")');
    await expect(placeOrderBtn).toBeEnabled({ timeout: 10_000 });
    await placeOrderBtn.click();

    await customerPage.waitForURL(/\/orders\/.+/, { timeout: 15_000 });

    const orderUrl = customerPage.url();
    const orderId = orderUrl.split('/orders/')[1]?.split('?')[0];
    expect(orderId).toBeTruthy();

    // 4. Admin visits /admin/orders and updates order status to SHIPPED
    await adminPage.goto('/admin/orders');
    await adminPage.waitForLoadState('networkidle');

    const statusSelect = adminPage.locator('table select').first();
    await statusSelect.selectOption('SHIPPED');
    await adminPage.waitForTimeout(1000);

    await adminPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'scenario-d-admin-order-shipped.png'),
      fullPage: true,
    });

    // 5. Customer refreshes /orders/[id] and confirms it updated to SHIPPED
    await customerPage.goto(`/orders/${orderId}`);
    await customerPage.reload();
    await customerPage.waitForLoadState('networkidle');

    await expect(customerPage.locator('text=SHIPPED').first()).toBeVisible({ timeout: 10_000 });

    await customerPage.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'scenario-d-customer-shipped.png'),
      fullPage: true,
    });

    await adminContext.close();
    await customerContext.close();
  });
});
