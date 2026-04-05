import { emailField, stringField } from "../../lib/validation.js";

export const registerBodySchema = {
  fullName: stringField({
    min: 3,
    max: 80,
    messages: {
      min: "Full name must contain between 3 and 80 characters",
      max: "Full name must contain between 3 and 80 characters"
    }
  }),
  email: emailField(),
  password: stringField({
    min: 8,
    max: 128,
    messages: {
      min: "Password must contain at least 8 characters"
    }
  })
};

export const loginBodySchema = {
  email: emailField(),
  password: stringField({
    min: 1
  })
};
