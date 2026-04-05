-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('FLUTTERWAVE', 'MOCK');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "checkoutUrl" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "provider" "PaymentProvider" NOT NULL DEFAULT 'MOCK',
ADD COLUMN     "providerPayload" JSONB,
ADD COLUMN     "providerTransactionId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

UPDATE "Payment"
SET
  "customerEmail" = COALESCE("customerEmail", 'legacy-payment@example.com'),
  "customerName" = COALESCE("customerName", 'Legacy Customer');

ALTER TABLE "Payment"
ALTER COLUMN "customerEmail" SET NOT NULL,
ALTER COLUMN "customerName" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");
