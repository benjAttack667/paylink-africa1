"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/ui/auth-card";
import PageShell from "@/components/ui/page-shell";
import { apiRequest } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { hasValidationErrors, validateLoginForm } from "@/lib/validation";

const initialForm = {
  email: "",
  password: ""
};

export default function LoginPageClient() {
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

    const validationErrors = validateLoginForm(form);
    setFieldErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: {
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
        badge="Vendeur"
        title="Connexion"
        description="Connectez-vous pour gerer vos produits, vos liens de paiement et les paiements recus."
        footerText="Pas encore de compte ?"
        footerLabel="Creer un compte"
        footerHref="/register"
      >
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="label-text" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
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
            <label className="label-text" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              className={`auth-input ${fieldErrors.password ? "input-error" : ""}`}
              name="password"
              type="password"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
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
                ? "Connexion..."
                : "Se connecter"}
          </button>
        </form>
      </AuthCard>
    </PageShell>
  );
}
