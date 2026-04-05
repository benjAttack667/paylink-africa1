import Link from "next/link";
import CopyLinkButton from "@/components/ui/copy-link-button";
import StatusBadge from "@/components/ui/status-badge";
import { formatDateTime, formatPrice } from "@/lib/format";

export default function PaymentLinkCard({ item, isSelected, isLoading, onSelect }) {
  return (
    <article
      className={`content-auto-card rounded-[24px] border p-5 transition duration-200 ${
        isSelected
          ? "border-brand-300 bg-white shadow-md"
          : "border-black/10 bg-black/[0.025] hover:-translate-y-0.5 hover:border-black/20 hover:bg-white/72 hover:shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-heading text-2xl font-semibold">{item.name}</h3>
            <StatusBadge status={item.status} />
            {isSelected ? <span className="info-pill">Selection actuelle</span> : null}
          </div>
          <p className="max-w-2xl text-sm leading-6 text-black/72">
            {item.description || "Aucune description pour ce produit."}
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-left shadow-sm sm:text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Prix</p>
          <p className="mt-2 font-heading text-2xl font-semibold">
            {formatPrice(item.price)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Paiements</p>
          <p className="mt-2 text-lg font-semibold">{item.paymentsCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Total collecte</p>
          <p className="mt-2 text-lg font-semibold">{formatPrice(item.totalCollected)}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Cree le</p>
          <p className="mt-2 text-sm font-medium">{formatDateTime(item.createdAt)}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Lien public</p>
          <Link
            href={`/pay/${item.slug}`}
            prefetch={false}
            className="mt-2 block break-all text-sm font-medium text-pine hover:text-brand-700"
            target="_blank"
          >
            /pay/{item.slug}
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-black/80">
            Derniers paiements recus pour ce lien
          </p>
          <p className="mt-1 text-xs text-black/58">
            {item.recentPayments.length} paiement(s) affiche(s)
          </p>
        </div>

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

      {item.recentPayments.length === 0 ? (
        <p className="mt-4 text-sm text-black/64">Aucun paiement recu pour le moment.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {item.recentPayments.map((payment) => (
            <div
              key={payment.id}
              className="content-auto-card flex flex-col gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 transition duration-200 hover:border-black/15 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{payment.reference}</p>
                <p className="mt-1 text-xs text-black/62">
                  {payment.customerName || "Client non renseigne"}
                  {payment.customerEmail ? ` - ${payment.customerEmail}` : ""}
                </p>
                <p className="mt-1 text-xs text-black/58">
                  {formatDateTime(payment.paidAt || payment.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={payment.status} />
                <p className="text-sm font-semibold">{formatPrice(payment.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
