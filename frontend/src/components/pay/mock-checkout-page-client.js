"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import PageShell from "@/components/ui/page-shell";
import StatusBadge from "@/components/ui/status-badge";
import { apiRequest } from "@/lib/api";
import { formatDateTime, formatPrice } from "@/lib/format";
import { publicRuntimeConfig } from "@/lib/runtime-config";

function TrustCard({ icon: Icon, label, value, helper, tone = "default" }) {
  return (
    <div
      className={`rounded-[24px] border p-5 backdrop-blur ${
        tone === "dark"
          ? "border-white/10 bg-white/10"
          : "border-black/10 bg-white/90"
      }`}
    >
      <span
        className={
          tone === "dark"
            ? "feature-icon-shell-dark"
            : "feature-icon-shell text-pine"
        }
      >
        <Icon size={18} />
      </span>
      <p
        className={`mt-4 text-xs uppercase tracking-[0.2em] ${
          tone === "dark" ? "text-white/50" : "text-black/45"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-3 font-heading text-2xl font-semibold ${
          tone === "dark" ? "text-white" : "text-ink"
        }`}
      >
        {value}
      </p>
      {helper ? (
        <p className={`mt-2 text-sm leading-6 ${tone === "dark" ? "text-white/68" : "text-black/58"}`}>
          {helper}
        </p>
      ) : null}
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
            Ce checkout mock reste utile pour valider l'experience complete sans
            activer de debit reel tant que le provider live n'est pas configure.
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
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow border-white/15 bg-white/10 text-white/85 shadow-none">
                Checkout simule
              </span>
              <span className="info-pill border-white/10 bg-white/10 text-white/75 shadow-none">
                Parcours premium pre-production
              </span>
              {publicRuntimeConfig.isPreProduction ? (
                <span className="stage-pill border-white/12 bg-white/10 text-white/85 shadow-none">
                  Pre-production
                </span>
              ) : null}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-tight text-white md:text-5xl">
                {session.product.name}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-white/74">
                {session.product.description ||
                  "Ce checkout de demonstration reproduit une experience de paiement plus claire, plus rassurante et plus simple a terminer."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TrustCard
                icon={Lock}
                label="Montant"
                value={formatPrice(session.amount)}
                helper="Montant affiche avant validation."
                tone="dark"
              />
              <TrustCard
                icon={ShieldCheck}
                label="Vendeur"
                value={session.product.sellerName || "Ce vendeur"}
                helper={`Session creee le ${formatDateTime(session.createdAt)}`}
                tone="dark"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="hero-proof-card">
                <div className="feature-icon-shell-dark">
                  <Smartphone size={18} />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">Mobile Money</p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Une experience pensee pour les usages mobiles qui dominent les paiements au quotidien.
                </p>
              </div>
              <div className="hero-proof-card">
                <div className="feature-icon-shell-dark">
                  <CreditCard size={18} />
                </div>
                <p className="mt-4 text-sm font-semibold text-white">Carte bancaire</p>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Une alternative plus classique pour les clients qui preferent la carte.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/8 p-5 text-sm leading-7 text-white/72 backdrop-blur">
              La vision derriere ce checkout est simple : transformer un simple lien
              en une experience plus credible, plus rassurante et plus digne d'un
              vrai progres pour le vendeur comme pour le client.
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <TrustCard
              icon={Smartphone}
              label="Canal favori"
              value="Mobile Money"
              helper="Parcours fluide sur mobile."
            />
            <TrustCard
              icon={Activity}
              label="Statut"
              value={isPaid ? "Valide" : "En attente"}
              helper="Confirmation retournee sur le lien public."
            />
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
                className="primary-button w-full gap-2"
                type="button"
                onClick={handleComplete}
                disabled={!isClientReady || submitting}
              >
                <Lock size={16} />
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
            <span className="info-pill">
              <ShieldCheck size={14} />
              Debit reel inactive tant que les cles live ne sont pas configurees
            </span>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
