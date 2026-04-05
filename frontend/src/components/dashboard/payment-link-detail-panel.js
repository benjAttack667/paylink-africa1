import Link from "next/link";
import CopyLinkButton from "@/components/ui/copy-link-button";
import StatusBadge from "@/components/ui/status-badge";
import { formatDateTime, formatPrice } from "@/lib/format";

function LoadingSkeleton() {
  return (
    <section className="surface-card p-7 md:p-8">
      <div className="animate-pulse space-y-5">
        <div className="h-7 w-40 rounded-full bg-black/10" />
        <div className="h-4 w-3/4 rounded-full bg-black/10" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl bg-black/[0.05]" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-12 rounded-2xl bg-black/[0.05]" />
          <div className="h-12 rounded-2xl bg-black/[0.05]" />
          <div className="h-32 rounded-3xl bg-black/[0.05]" />
        </div>
      </div>
    </section>
  );
}

export default function PaymentLinkDetailPanel({
  item,
  form,
  fieldErrors,
  loading,
  saving,
  togglingStatus,
  deleting,
  onChange,
  onSubmit,
  onToggleStatus,
  onDelete
}) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!item) {
    return (
      <section className="surface-card p-7 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-semibold">Gerer un lien</h2>
          <span className="info-pill">Selection requise</span>
        </div>

        <div className="muted-panel mt-6 p-8 text-sm leading-7 text-black/60">
          Selectionnez un lien dans la liste pour modifier ses informations,
          changer son statut, consulter tous ses paiements ou le supprimer.
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card p-7 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-2xl font-semibold">Gerer ce lien</h2>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm leading-7 text-black/72">
            Le lien public reste stable meme si vous modifiez le nom du produit.
          </p>
        </div>

        <Link
          href={`/pay/${item.slug}`}
          prefetch={false}
          target="_blank"
          className="ghost-button w-full md:w-auto"
        >
          Ouvrir la page publique
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <CopyLinkButton path={`/pay/${item.slug}`} />
        <span className="info-pill">{item.payments.length} paiement(s) dans l'historique</span>
        <span className="info-pill">Coordonnees client masquees</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Slug public</p>
          <p className="mt-2 break-all text-sm font-semibold text-ink">{item.slug}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Prix actuel</p>
          <p className="mt-2 text-sm font-semibold text-ink">{formatPrice(item.price)}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Paiements recus</p>
          <p className="mt-2 text-sm font-semibold text-ink">{item.paymentsCount}</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Total collecte</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {formatPrice(item.totalCollected)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Cree le</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {formatDateTime(item.createdAt)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-black/58">Mis a jour</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {formatDateTime(item.updatedAt)}
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
        <div>
          <label className="label-text" htmlFor="selected-product-name">
            Nom du produit
          </label>
          <input
            id="selected-product-name"
            className={`auth-input ${fieldErrors.name ? "input-error" : ""}`}
            name="name"
            type="text"
            value={form.name}
            onChange={onChange}
          />
          {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
        </div>

        <div>
          <label className="label-text" htmlFor="selected-product-price">
            Prix
          </label>
          <input
            id="selected-product-price"
            className={`auth-input ${fieldErrors.price ? "input-error" : ""}`}
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={onChange}
          />
          {fieldErrors.price ? <p className="field-error">{fieldErrors.price}</p> : null}
        </div>

        <div>
          <label className="label-text" htmlFor="selected-product-description">
            Description
          </label>
          <textarea
            id="selected-product-description"
            className={`auth-input min-h-32 resize-none ${fieldErrors.description ? "input-error" : ""}`}
            name="description"
            value={form.description}
            onChange={onChange}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-black/60">
            <span>300 caracteres maximum.</span>
            <span>{form.description.length}/300</span>
          </div>
          {fieldErrors.description ? (
            <p className="field-error">{fieldErrors.description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="primary-button w-full sm:w-auto" type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
          <button
            className="ghost-button w-full sm:w-auto"
            type="button"
            onClick={onToggleStatus}
            disabled={togglingStatus}
          >
            {togglingStatus
              ? "Mise a jour..."
              : item.isActive
                ? "Desactiver le lien"
                : "Activer le lien"}
          </button>
          <button
            className="destructive-button w-full sm:w-auto"
            type="button"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Suppression..." : "Supprimer le lien"}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-3xl border border-black/10 bg-black/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-xl font-semibold">Historique des paiements</h3>
          <span className="text-sm text-black/62">{item.payments.length} paiement(s)</span>
        </div>

        {item.payments.length === 0 ? (
          <p className="mt-4 text-sm text-black/64">Aucun paiement recu pour ce lien.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {item.payments.map((payment) => (
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
                  {payment.customerPhone ? (
                    <p className="mt-1 text-xs text-black/58">{payment.customerPhone}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-black/58">
                    {formatDateTime(payment.paidAt || payment.createdAt)}
                  </p>
                  {payment.failureReason ? (
                    <p className="mt-1 text-xs text-red-600">{payment.failureReason}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={payment.status} />
                  <p className="text-sm font-semibold">{formatPrice(payment.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
