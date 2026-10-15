import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { Order } from '@prisma/client';

const transporter = env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (!transporter || !env.SMTP_FROM) {
    if (env.NODE_ENV !== 'production') console.info(`[development] OTP for ${email}: ${otp}`);
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Your verification code',
    text: `Your verification code is ${otp}. It expires in ${env.OTP_EXPIRY_MINUTES} minutes.`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  if (!transporter || !env.SMTP_FROM) {
    if (env.NODE_ENV !== 'production') console.info(`[development] reset token for ${email}: ${token}`);
    return;
  }

  const url = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Reset your password',
    text: `Reset your password using this link: ${url}`,
  });
}

type OrderEmail = Pick<Order, 'id' | 'totalPaise'> & { items: Array<{ productName: string; quantity: number }> };

export async function sendOrderConfirmationEmail(email: string, order: OrderEmail): Promise<void> {
  await sendConfiguredEmail(email, `Order ${order.id} confirmed`, `Your order ${order.id} has been confirmed. Total: INR ${(order.totalPaise / 100).toFixed(2)}.`);
}

export async function sendOutOfStockPaymentEmail(email: string, orderId: string, totalPaise: number): Promise<void> {
  await sendConfiguredEmail(
    email,
    `Payment refund for order ${orderId}`,
    `Your payment for order ${orderId} was refunded because the requested stock was no longer available. Refunded amount: INR ${(totalPaise / 100).toFixed(2)}.`,
  );
}

export async function sendLowStockAlertEmail(email: string, productName: string, sku: string, quantity: number): Promise<void> {
  await sendConfiguredEmail(email, `Low stock alert: ${sku}`, `${productName} (${sku}) has only ${quantity} units remaining.`);
}

export async function sendAbandonedCartEmail(email: string, itemCount: number): Promise<void> {
  await sendConfiguredEmail(email, 'You left items in your cart', `Your cart still contains ${itemCount} item${itemCount === 1 ? '' : 's'}.`);
}

async function sendConfiguredEmail(to: string, subject: string, text: string): Promise<void> {
  if (!transporter || !env.SMTP_FROM) {
    if (env.NODE_ENV !== 'production') console.info(`[development] email for ${to}: ${subject} - ${text}`);
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text });
}
