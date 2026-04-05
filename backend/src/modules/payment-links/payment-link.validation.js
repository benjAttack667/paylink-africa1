import {
  booleanField,
  decimalField,
  emailField,
  idField,
  slugField,
  stringField
} from "../../lib/validation.js";

const nameField = stringField({
  min: 3,
  max: 80
});

const descriptionField = stringField({
  required: false,
  max: 300,
  nullable: true,
  emptyAsNull: true
});

export const createPaymentLinkBodySchema = {
  name: nameField,
  price: decimalField(),
  description: descriptionField
};

export const updatePaymentLinkBodySchema = {
  name: {
    ...nameField,
    required: false
  },
  price: {
    ...decimalField(),
    required: false
  },
  description: descriptionField
};

export const updatePaymentLinkStatusBodySchema = {
  isActive: booleanField()
};

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

export const sellerProductParamsSchema = {
  productId: idField()
};

export const publicSlugParamsSchema = {
  slug: slugField()
};
