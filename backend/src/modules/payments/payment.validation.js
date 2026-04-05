import { emailField, stringField } from "../../lib/validation.js";

export const initiatePaymentBodySchema = {
  customerEmail: emailField(),
  customerName: stringField({
    min: 3,
    max: 80
  }),
  customerPhone: stringField({
    required: false,
    min: 6,
    max: 24,
    nullable: true,
    emptyAsNull: true
  })
};

export const flutterwaveCallbackQuerySchema = {
  status: stringField({
    required: false,
    min: 1,
    max: 40
  }),
  tx_ref: stringField({
    required: false,
    min: 1,
    max: 64
  }),
  transaction_id: stringField({
    required: false,
    min: 1,
    max: 64
  })
};

export const paymentReferenceParamsSchema = {
  reference: stringField({
    min: 1,
    max: 64
  })
};

export const paymentReceiptQuerySchema = {
  token: stringField({
    min: 1,
    max: 2048
  })
};
