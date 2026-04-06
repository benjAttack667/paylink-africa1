import Link from "next/link";
import { Activity, CheckCircle2, Link2 } from "lucide-react";
import CopyLinkButton from "@/components/ui/copy-link-button";
import StatusBadge from "@/components/ui/status-badge";
import { formatDateTime, formatPrice } from "@/lib/format";

export default function PaymentLinkCard({ item, isSelected, isLoading, onSelect }) {
  const StatusIcon = item.isActive ? CheckCircle2 : Activity;

  return (
    <article
      className={`content-auto-card rounded-[24px] border p-4 transition duration-200 sm:p-5 ${
        isSelected
          ? "border-brand-300 bg-white shadow-md"
          : "border-black/10 bg-black/[0.025] hover:-translate-y-0.5 hover:border-black/20 hover:bg-white/72 hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="feature-icon-shell text-pine">
              <StatusIcon size={18} />
            </span>
            <h3 className="font-heading text-xl font-semibold sm:text-2xl">{item.name}</h3>
            <StatusBadge status={item.status} />
            {isSelected ? <span className="info-pill">Selection actuelle</span> : null}
          </div>
          <p className="text-sm leading-6 text-black/68">
            {item.description || "Aucune description pour ce produit."}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-black/56">
            <span>Cree le {formatDateTime(item.createdAt)}</span>
            <Link
              href={`/pay/${item.slug}`}
              prefetch={false}
              className="font-medium text-pine hover:text-brand-700"
              target="_blank"
            >
              <span className="inline-flex items-center gap-1">
                <Link2 size={14} />
                /pay/{item.slug}
              </span>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm sm:min-w-[150px] sm:text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Prix</p>
          <p className="mt-2 font-heading text-xl font-semibold sm:text-2xl">
            {formatPrice(item.price)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Paiements</p>
          <p className="mt-2 text-lg font-semibold">{item.paymentsCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Total collecte</p>
          <p className="mt-2 text-lg font-semibold">{formatPrice(item.totalCollected)}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Etat</p>
          <p className="mt-2 text-sm font-medium text-ink">
            {item.isActive ? "Accessible publiquement" : "Masque temporairement"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <p className="text-sm text-black/60">
          {item.recentPayments.length > 0
            ? `${item.recentPayments.length} paiement(s) recent(s) disponibles dans le detail`
            : "Aucun paiement recent pour ce lien"}
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="ghost-button" type="button" onClick={onSelect} disabled={isLoading}>
            {isLoading
              ? "Ouverture..."
              : isSelected
                ? "Lien selectionne"
                : "Gerer ce lien"}
          </button>
          <CopyLinkButton path={`/pay/${item.slug}`} />
          <Link
            href={`/pay/${item.slug}`}
            prefetch={false}
            target="_blank"
            className="ghost-button"
          >
            Ouvrir la page publique
          </Link>
        </div>
      </div>
    </article>
  );
}
