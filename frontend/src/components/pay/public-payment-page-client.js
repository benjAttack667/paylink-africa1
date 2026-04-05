"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CopyLinkButton from "@/components/ui/copy-link-button";
import PageShell from "@/components/ui/page-shell";
import StatusBadge from "@/components/ui/status-badge";
import { apiRequest, buildApiUrl } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { publicRuntimeConfig } from "@/lib/runtime-config";
import {
  hasValidationErrors,
  validatePublicPaymentForm
} from "@/lib/validation";

const initialCustomerForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: ""
};

const trustPoints = [
  "Aucun compte client requis",
  "Montant affiche avant paiement",
  "Verification serveur apres checkout"
];

function extractDownloadFileName(response, fallbackName) {
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ?? fallbackName;
}

function SummaryItem({ label, value, helper }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white/85 p-5 shadow-sm backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className="mt-3 font-heading text-3xl font-semibold text-ink">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-black/55">{helper}</p> : null}
    </div>
  );
}

function BenefitCard({ title, description }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-black/60">{description}</p>
    </div>
  );
}

function EmptyState({ error }) {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="surface-card grid gap-6 p-8 md:p-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <span className="eyebrow">Paiement public</span>
          <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
            Produit introuvable
          </h1>
          <p className="max-w-2xl text-base leading-7 text-black/65">
            Ce lien n'est plus disponible ou n'est pas accessible publiquement.
          </p>
          {error ? <p className="alert-error">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="primary-button">
              Retour a l'accueil
            </Link>
            <span className="info-pill">Demandez un nouveau lien au vendeur</span>
          </div>
        </div>

        <div className="muted-panel p-6 text-sm leading-7 text-black/60">
          Si vous avez recu ce lien par message ou par email, il est possible qu'il ait
          ete desactive, supprime ou remplace par une version plus recente.
        </div>
      </div>
    </section>
  );
}

export default function PublicPaymentPageClient({
  slug,
  initialItem,
  initialErrorMessage,
  paymentStatus,
  paymentReference,
  paymentReceiptToken,
  paymentReason
}) {
  const checkoutTrustPoints = publicRuntimeConfig.isPreProduction
    ? [...trustPoints, "Experience pre-production"]
    : trustPoints;
  const [item] = useState(initialItem);
  const [paying, setPaying] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [error, setError] = useState(initialErrorMessage ?? "");
  const [fieldErrors, setFieldErrors] = useState({});
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setCustomerForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: ""
    }));

    if (error) {
      setError("");
    }
  }

  async function handleDownloadReceipt() {
    if (!paymentReference || !paymentReceiptToken) {
      setReceiptError("Le recu n'est pas encore disponible pour ce paiement.");
      return;
    }

    setReceiptError("");
    setDownloadingReceipt(true);

    try {
      const response = await fetch(
        buildApiUrl(
          `/payments/${encodeURIComponent(paymentReference)}/receipt?token=${encodeURIComponent(paymentReceiptToken)}`
        ),
        {
          method: "GET",
          cache: "no-store",
          credentials: "omit"
        }
      );

      if (!response.ok) {
        let message = "Impossible de telecharger le recu pour le moment.";

        try {
          const payload = await response.json();

          if (payload?.message) {
            message = payload.message;
          }
        } catch {
          // Ignore non-JSON receipt failures and keep the generic message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const temporaryLink = document.createElement("a");
      temporaryLink.href = objectUrl;
      temporaryLink.download = extractDownloadFileName(
        response,
        `receipt-${paymentReference}.pdf`
      );
      temporaryLink.rel = "noopener";
      document.body.appendChild(temporaryLink);
      temporaryLink.click();
      temporaryLink.remove();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (requestError) {
      setReceiptError(requestError.message);
    } finally {
      setDownloadingReceipt(false);
    }
  }

  async function handlePay(event) {
    event.preventDefault();
    setError("");

    const validationErrors = validatePublicPaymentForm(customerForm);
    setFieldErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    setPaying(true);

    try {
      const response = await apiRequest(`/payment-links/${slug}/pay`, {
        method: "POST",
        body: {
          customerName: customerForm.customerName.trim(),
          customerEmail: customerForm.customerEmail.trim(),
          customerPhone: customerForm.customerPhone.trim()
        }
      });

      window.location.href = response.checkoutUrl;
    } catch (requestError) {
      setError(requestError.message);
      setPaying(false);
    }
  }

  function renderPaymentResult() {
    if (!paymentStatus || !paymentReference) {
      return null;
    }

    if (paymentStatus === "paid") {
      return (
        <div
          aria-live="polite"
          className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50/95 p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
              Paiement confirme
            </p>
            <StatusBadge status="PAID" />
          </div>
          <p className="mt-3 text-sm font-medium text-emerald-800">
            Reference: {paymentReference}
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Votre paiement a ete verifie cote serveur. Vous pouvez fermer cette page.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="primary-button w-full sm:w-auto"
              disabled={!paymentReceiptToken || downloadingReceipt}
              onClick={handleDownloadReceipt}
            >
              {downloadingReceipt
                ? "Preparation du recu..."
                : "Telecharger le recu PDF"}
            </button>
            <Link href="/" className="ghost-button w-full sm:w-auto">
              Revenir a l'accueil
            </Link>
          </div>
          {!paymentReceiptToken ? (
            <p className="mt-3 text-sm leading-6 text-emerald-800/90">
              Le recu sera disponible des que la confirmation complete sera finalisee.
            </p>
          ) : null}
          {receiptError ? <p className="mt-3 alert-error">{receiptError}</p> : null}
        </div>
      );
    }

    return (
      <div
        aria-live="polite"
        className="mt-6 rounded-[28px] border border-red-200 bg-red-50/95 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-red-700">
            Paiement non confirme
          </p>
          <StatusBadge status="FAILED" />
        </div>
        <p className="mt-3 text-sm font-medium text-red-800">Reference: {paymentReference}</p>
        <p className="mt-2 text-sm leading-6 text-red-800">
          {paymentReason || "Le paiement n'a pas pu etre confirme. Vous pouvez reessayer."}
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <PageShell className="flex items-center">
        <EmptyState error={error} />
      </PageShell>
    );
  }

  return (
    <PageShell className="flex items-center">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="surface-card p-8 md:p-10">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow">Paiement public</span>
                {checkoutTrustPoints.map((point) => (
                  <span key={point} className="info-pill">
                    {point}
                  </span>
                ))}
              </div>

              <div className="space-y-4">
                <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-6xl">
                  {item.name}
                </h1>
                <p className="max-w-3xl text-base leading-8 text-black/65 md:text-lg">
                  {item.description ||
                    "Finalisez votre paiement sur une page simple, claire et sans creation de compte."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryItem
              label="Montant"
              value={formatPrice(item.price)}
              helper="Montant affiche avant toute redirection."
            />
            <SummaryItem
              label="Vendeur"
              value={item.sellerName || "Ce vendeur"}
              helper={`Disponible depuis ${formatDateTime(item.createdAt)}`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <BenefitCard
              title="Simple a finaliser"
              description="Le client remplit trois champs, puis est redirige vers le checkout."
            />
            <BenefitCard
              title="Clair avant paiement"
              description="Le prix, le vendeur et le lien partage sont visibles avant l'action."
            />
            <BenefitCard
              title="Rassurant apres paiement"
              description="Le retour final affiche la confirmation ou l'echec avec la reference."
            />
          </div>
        </div>

        <aside className="surface-card p-8 lg:sticky lg:top-6 lg:self-start">
          {error ? <p className="alert-error">{error}</p> : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-black/45">
                Finaliser le paiement
              </p>
              <p className="mt-2 text-sm text-black/60">
                Aucun compte client n'est necessaire pour continuer.
              </p>
            </div>
            <CopyLinkButton
              path={`/pay/${item.slug}`}
              className="ghost-button w-full sm:w-auto"
              idleLabel="Copier ce lien"
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-black/10 bg-black/[0.03] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-black/45">
                  Resume de commande
                </p>
                <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight">
                  {item.name}
                </h2>
              </div>
              <StatusBadge status="PENDING" />
            </div>

            <div className="mt-5 space-y-3 text-sm text-black/60">
              <div className="flex items-center justify-between gap-4">
                <span>Montant total</span>
                <span className="font-heading text-3xl font-semibold text-ink">
                  {formatPrice(item.price)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Vendeur</span>
                <span className="font-medium text-ink">{item.sellerName || "Ce vendeur"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Lien partage</span>
                <span className="font-medium text-ink">/pay/{item.slug}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {checkoutTrustPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-black/65"
                >
                  {point}
                </div>
              ))}
            </div>

            {publicRuntimeConfig.isPreProduction ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/85 px-4 py-4 text-sm leading-6 text-amber-900">
                Cette experience suit le parcours final attendu et reste prete pour une
                activation live lors du deploiement.
              </div>
            ) : null}
          </div>

          <form className="mt-6 space-y-5" onSubmit={handlePay} noValidate>
            <div>
              <label className="label-text" htmlFor="customer-name">
                Nom complet
              </label>
              <input
                id="customer-name"
                className={`auth-input ${fieldErrors.customerName ? "input-error" : ""}`}
                name="customerName"
                type="text"
                placeholder="Votre nom complet"
                autoComplete="name"
                value={customerForm.customerName}
                disabled={!isClientReady || paying}
                onChange={handleChange}
              />
              {fieldErrors.customerName ? (
                <p className="field-error">{fieldErrors.customerName}</p>
              ) : null}
            </div>

            <div>
              <label className="label-text" htmlFor="customer-email">
                Email
              </label>
              <input
                id="customer-email"
                className={`auth-input ${fieldErrors.customerEmail ? "input-error" : ""}`}
                name="customerEmail"
                type="email"
                placeholder="vous@exemple.com"
                autoComplete="email"
                value={customerForm.customerEmail}
                disabled={!isClientReady || paying}
                onChange={handleChange}
              />
              {fieldErrors.customerEmail ? (
                <p className="field-error">{fieldErrors.customerEmail}</p>
              ) : null}
            </div>

            <div>
              <label className="label-text" htmlFor="customer-phone">
                Telephone
              </label>
              <input
                id="customer-phone"
                className={`auth-input ${fieldErrors.customerPhone ? "input-error" : ""}`}
                name="customerPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+2250700000000"
                value={customerForm.customerPhone}
                disabled={!isClientReady || paying}
                onChange={handleChange}
              />
              {fieldErrors.customerPhone ? (
                <p className="field-error">{fieldErrors.customerPhone}</p>
              ) : null}
            </div>

            <button
              className="primary-button w-full"
              type="submit"
              disabled={!isClientReady || paying}
            >
              {!isClientReady ? "Initialisation..." : paying ? "Redirection..." : "Payer maintenant"}
            </button>

            <p className="text-sm leading-6 text-black/55">
              {paying
                ? "Redirection vers le checkout en cours..."
                : "En cliquant sur ce bouton, vous serez redirige vers le checkout pour terminer le paiement."}
            </p>
          </form>

          {renderPaymentResult()}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-black/55">
            <Link href="/" className="font-medium text-pine hover:text-brand-700">
              Retour a l'accueil
            </Link>
            <span className="info-pill">Paiement verifie cote serveur</span>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
