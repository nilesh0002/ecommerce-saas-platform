import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

export const BACKEND_URL = process.env.API_URL || 'http://localhost:5000/api/v1';
export const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

export function signRazorpayWebhook(payload: Record<string, unknown>, secret: string): string {
  const body = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}
