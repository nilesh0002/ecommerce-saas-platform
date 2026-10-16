import { test, expect } from '@playwright/test';
import path from 'node:path';
import { SCREENSHOTS_DIR, signRazorpayWebhook, uniqueEmail } from './helpers/test-utils';
import { createPendingRazorpayOrder, createTestUser } from './helpers/db';

test.describe('Scenario B: Razorpay test payment via signed webhook', () => {
  test('posts signed payment.captured webhook to backend and verifies order updates to PAID and CONFIRMED', async ({ page, request }) => {
    // 1. Create a customer with a saved address in DB
    const email = uniqueEmail('razorpay-cust');
    const { user, address } = await createTestUser(email);

    // 2. Create a pending Razorpay order for this user
    const { order, razorpayOrderId } = await createPendingRazorpayOrder(user.id, address.id);

    // 3. Log in through the UI as customer
    await page.goto('/login');
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign in")');
    await page.waitForURL(/\/(profile|$)/);

    // 4. Navigate customer to /orders/[id] and verify initial PENDING status
    await page.goto(`/orders/${order.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=PENDING').first()).toBeVisible();

    // 5. Post a signed Razorpay webhook to the backend
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret_12345';
    const paymentId = `pay_test_${Date.now()}`;
    const eventId = `event_test_${Date.now()}`;
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: razorpayOrderId,
            amount: order.totalPaise,
            status: 'captured',
            method: 'upi',
          },
        },
      },
    };

    const signature = signRazorpayWebhook(webhookPayload, webhookSecret);
    const webhookRes = await request.post('http://localhost:5000/api/v1/payments/webhook/razorpay', {
      data: webhookPayload,
      headers: {
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
        'Content-Type': 'application/json',
      },
    });

    expect(webhookRes.status()).toBe(200);

    // 6. Reload customer page /orders/[id] and verify updated CONFIRMED status
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=CONFIRMED').first()).toBeVisible({ timeout: 15_000 });

    // Save screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'scenario-b-payment-captured.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
  });
});
