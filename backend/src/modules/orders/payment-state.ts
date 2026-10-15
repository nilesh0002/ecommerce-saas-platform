import { OrderStatus } from '@prisma/client';

export function isCapturedPayment(remoteOrderStatus: string | undefined, payments: Array<{ status?: string }>): boolean {
  return remoteOrderStatus === 'paid' || payments.some((payment) => payment.status === 'captured');
}

export function shouldCancelPendingOrder(status: OrderStatus): boolean {
  return status === OrderStatus.PENDING;
}
