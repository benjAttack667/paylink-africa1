"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/ui/auth-card";
import PageShell from "@/components/ui/page-shell";
import { apiRequest } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { hasValidationErrors, validateRegisterForm } from "@/lib/validation";

const initialForm = {
  fullName: "",
  email: "",
  password: ""
};

export default function RegisterPageClient() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: ""
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationErrors = validateRegisterForm(form);
    setFieldErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password
        }
      });

      saveSession(response);
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell className="flex items-center justify-center">
      <AuthCard
        badge="Onboarding"
        title="Creer un compte vendeur"
        description="Inscrivez-vous pour publier des liens de paiement et suivre les paiements recus."
        footerText="Deja inscrit ?"
        footerLabel="Se connecter"
        footerHref="/login"
      >
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="label-text" htmlFor="register-name">
              Nom complet
            </label>
            <input
              id="register-name"
              className={`auth-input ${fieldErrors.fullName ? "input-error" : ""}`}
              name="fullName"
              type="text"
              placeholder="Nom complet"
              autoComplete="name"
              value={form.fullName}
              disabled={!isClientReady || loading || isPending}
              onChange={handleChange}
            />
            {fieldErrors.fullName ? (
              <p className="field-error">{fieldErrors.fullName}</p>
            ) : null}
          </div>

          <div>
            <label className="label-text" htmlFor="register-email">
              Email
            </label>
            <input
              id="register-email"
              className={`auth-input ${fieldErrors.email ? "input-error" : ""}`}
              name="email"
              type="email"
              placeholder="nom@entreprise.com"
              autoComplete="email"
              value={form.email}
              disabled={!isClientReady || loading || isPending}
              onChange={handleChange}
            />
            {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
          </div>

          <div>
            <label className="label-text" htmlFor="register-password">
              Mot de passe
            </label>
            <input
              id="register-password"
              className={`auth-input ${fieldErrors.password ? "input-error" : ""}`}
              name="password"
              type="password"
              placeholder="Au moins 8 caracteres"
              autoComplete="new-password"
              value={form.password}
              disabled={!isClientReady || loading || isPending}
              onChange={handleChange}
            />
            {fieldErrors.password ? (
              <p className="field-error">{fieldErrors.password}</p>
            ) : null}
          </div>

          {error ? <p className="alert-error">{error}</p> : null}

          <button
            className="primary-button w-full"
            type="submit"
            disabled={!isClientReady || loading || isPending}
          >
            {!isClientReady
              ? "Initialisation..."
              : loading || isPending
                ? "Creation..."
                : "Creer mon compte"}
          </button>
        </form>
      </AuthCard>
    </PageShell>
  );
}
