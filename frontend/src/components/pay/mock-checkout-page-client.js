"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "@/components/ui/page-shell";
import StatusBadge from "@/components/ui/status-badge";
import { apiRequest } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { publicRuntimeConfig } from "@/lib/runtime-config";

function TrustCard({ label, value, helper }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="mt-3 font-heading text-2xl font-semibold text-white">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-white/68">{helper}</p> : null}
    </div>
  );
}

function EmptyState({ error }) {
  return (
    <PageShell className="flex items-center">
      <section className="mx-auto w-full max-w-4xl">
        <div className="surface-card grid gap-6 p-8 md:p-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <span className="eyebrow">Checkout simule</span>
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              Session de paiement indisponible
            </h1>
            <p className="max-w-2xl text-base leading-7 text-black/65">
              Cette session n'est plus disponible ou n'appartient pas a un parcours de
              demonstration actif.
            </p>
            {error ? <p className="alert-error">{error}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="primary-button">
                Retour a l'accueil
              </Link>
            </div>
          </div>

          <div className="muted-panel p-6 text-sm leading-7 text-black/60">
            Tant que le gateway live n'est pas configure, le checkout mock permet de
            valider le parcours complet sans activer un debit reel.
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default function MockCheckoutPageClient({
  reference,
  initialSession,
  initialErrorMessage
}) {
  const [session] = useState(initialSession);
  const [error, setError] = useState(initialErrorMessage ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  if (!session) {
    return <EmptyState error={error} />;
  }

  async function handleComplete() {
    setError("");
    setSubmitting(true);

    try {
      const response = await apiRequest(`/payments/mock/${reference}/complete`, {
        method: "POST"
      });

      window.location.href = response.redirectUrl;
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  const isPaid = session.status === "PAID";

  return (
    <PageShell className="flex items-center">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="surface-card-dark p-8 md:p-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow border-white/15 bg-white/10 text-white/85 shadow-none">
                Checkout simule
              </span>
              <span className="info-pill border-white/10 bg-white/10 text-white/75 shadow-none">
                Pret a passer live avec les cles provider
              </span>
              {publicRuntimeConfig.isPreProduction ? (
                <span className="stage-pill border-white/12 bg-white/10 text-white/85 shadow-none">
                  Pre-production
                </span>
              ) : null}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-white md:text-5xl">
                {session.product.name}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/74">
                {session.product.description ||
                  "Ce checkout de demonstration reproduit le parcours final attendu avant activation du gateway live."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TrustCard
                label="Montant"
                value={formatPrice(session.amount)}
                helper="Montant affiche avant validation."
              />
              <TrustCard
                label="Vendeur"
                value={session.product.sellerName || "Ce vendeur"}
                helper={`Session creee le ${formatDateTime(session.createdAt)}`}
              />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 text-sm leading-7 text-white/72 backdrop-blur">
              Le comportement live est deja prepare. Tant que tu restes en mode
              `MOCK`, ce checkout sert a valider l'experience complete. Quand tu
              ajouteras les vraies cles et `PAYMENT_GATEWAY=FLUTTERWAVE`, la
              redirection partira automatiquement vers le provider reel.
            </div>
          </div>
        </div>

        <aside className="surface-card p-8 lg:self-start">
          {error ? <p className="alert-error">{error}</p> : null}

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/45">
                Resume du checkout
              </p>
              <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-ink">
                Reference {session.reference}
              </h2>
            </div>
            <StatusBadge status={session.status} />
          </div>

          <div className="mt-6 space-y-4 rounded-[28px] border border-black/10 bg-black/[0.03] p-6">
            <div className="flex items-center justify-between gap-4 text-sm text-black/60">
              <span>Produit</span>
              <span className="font-medium text-ink">{session.product.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm text-black/60">
              <span>Montant total</span>
              <span className="font-heading text-3xl font-semibold text-ink">
                {formatPrice(session.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm text-black/60">
              <span>Mode</span>
              <span className="font-medium text-ink">Simulation securisee</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm text-black/60">
              <span>Resultat attendu</span>
              <span className="font-medium text-ink">Confirmation cote serveur</span>
            </div>
          </div>

          {isPaid ? (
            <div className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50/95 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                Paiement deja confirme
              </p>
              <p className="mt-3 text-sm leading-6 text-emerald-800">
                Cette session a deja ete validee. Vous pouvez revenir au lien public
                pour voir le resultat final.
              </p>
              <Link
                href={`/pay/${session.product.slug}?payment_status=paid&payment_reference=${encodeURIComponent(session.reference)}${
                  session.receiptToken
                    ? `&payment_receipt_token=${encodeURIComponent(session.receiptToken)}`
                    : ""
                }`}
                className="primary-button mt-5 w-full"
              >
                Retour au lien paye
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <button
                className="primary-button w-full"
                type="button"
                onClick={handleComplete}
                disabled={!isClientReady || submitting}
              >
                {!isClientReady
                  ? "Initialisation..."
                  : submitting
                    ? "Confirmation..."
                    : "Confirmer le paiement simule"}
              </button>

              <p className="text-sm leading-6 text-black/58">
                Ce bouton valide la transaction mock et renvoie ensuite vers la page
                publique avec le statut final, exactement comme le parcours live devra
                le faire plus tard.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-black/55">
            <Link href={`/pay/${session.product.slug}`} className="font-medium text-pine hover:text-brand-700">
              Retour au lien public
            </Link>
            <span className="info-pill">Debit reel inactive tant que les cles live ne sont pas configurees</span>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
