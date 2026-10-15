import Razorpay from 'razorpay';
import { env } from './env';
import { AppError } from '../utils/errors';

let testClient: Razorpay | undefined;

export function getRazorpay(): Razorpay {
  if (testClient) return testClient;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, 'Razorpay is not configured', 'PAYMENT_NOT_CONFIGURED');
  }

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export function setRazorpayForTests(client: Razorpay | undefined): void {
  testClient = client;
}

export function getRazorpayKeyId(): string {
  if (!env.RAZORPAY_KEY_ID) throw new AppError(503, 'Razorpay is not configured', 'PAYMENT_NOT_CONFIGURED');
  return env.RAZORPAY_KEY_ID;
}
