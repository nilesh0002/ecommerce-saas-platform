-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';

-- CreateIndex
CREATE INDEX "Refund_orderId_status_idx" ON "Refund"("orderId", "status");
