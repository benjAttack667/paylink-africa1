function isFilledString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateLoginForm(values) {
  const errors = {};

  if (!isFilledString(values.email)) {
    errors.email = "L'email est requis.";
  } else if (!isValidEmail(values.email.trim())) {
    errors.email = "Entrez un email valide.";
  }

  if (!isFilledString(values.password)) {
    errors.password = "Le mot de passe est requis.";
  }

  return errors;
}

export function validateRegisterForm(values) {
  const errors = validateLoginForm(values);

  if (!isFilledString(values.fullName)) {
    errors.fullName = "Le nom complet est requis.";
  } else if (values.fullName.trim().length < 3) {
    errors.fullName = "Le nom doit contenir au moins 3 caracteres.";
  }

  if (!isFilledString(values.password)) {
    errors.password = "Le mot de passe est requis.";
  } else if (values.password.trim().length < 8) {
    errors.password = "Le mot de passe doit contenir au moins 8 caracteres.";
  }

  return errors;
}

export function validateProductForm(values) {
  const errors = {};
  const parsedPrice = Number(values.price);

  if (!isFilledString(values.name)) {
    errors.name = "Le nom du produit est requis.";
  } else if (values.name.trim().length < 3) {
    errors.name = "Le nom doit contenir au moins 3 caracteres.";
  } else if (values.name.trim().length > 80) {
    errors.name = "Le nom doit contenir au maximum 80 caracteres.";
  }

  if (!isFilledString(values.price)) {
    errors.price = "Le prix est requis.";
  } else if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    errors.price = "Entrez un prix positif.";
  }

  if (values.description?.trim().length > 300) {
    errors.description = "La description doit contenir au maximum 300 caracteres.";
  }

  return errors;
}

export function validatePublicPaymentForm(values) {
  const errors = {};

  if (!isFilledString(values.customerName)) {
    errors.customerName = "Le nom complet est requis.";
  } else if (values.customerName.trim().length < 3) {
    errors.customerName = "Le nom doit contenir au moins 3 caracteres.";
  } else if (values.customerName.trim().length > 80) {
    errors.customerName = "Le nom doit contenir au maximum 80 caracteres.";
  }

  if (!isFilledString(values.customerEmail)) {
    errors.customerEmail = "L'email est requis.";
  } else if (!isValidEmail(values.customerEmail.trim())) {
    errors.customerEmail = "Entrez un email valide.";
  }

  if (isFilledString(values.customerPhone)) {
    const normalizedPhone = values.customerPhone.trim();

    if (normalizedPhone.length < 6 || normalizedPhone.length > 24) {
      errors.customerPhone = "Le numero doit contenir entre 6 et 24 caracteres.";
    }
  }

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}
