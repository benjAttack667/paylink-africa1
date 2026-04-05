"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PaymentLinkCard from "@/components/dashboard/payment-link-card";
import PaymentLinkDetailPanel from "@/components/dashboard/payment-link-detail-panel";
import PageShell from "@/components/ui/page-shell";
import StatusBadge from "@/components/ui/status-badge";
import {
  apiRequest,
  isForbiddenError,
  isNotFoundError,
  isUnauthorizedError
} from "@/lib/api";
import { clearSession, getCsrfToken, saveSession } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { publicRuntimeConfig } from "@/lib/runtime-config";
import { hasValidationErrors, validateProductForm } from "@/lib/validation";

const initialForm = {
  name: "",
  price: "",
  description: ""
};

const statusFilters = [
  { value: "ALL", label: "Tous" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "INACTIVE", label: "Inactifs" }
];

function buildProductForm(product) {
  return {
    name: product?.name ?? "",
    price: product?.price ?? "",
    description: product?.description ?? ""
  };
}

function normalizeDashboardData(data = {}) {
  return {
    items: data.items ?? [],
    recentPayments: data.recentPayments ?? [],
    summary: data.summary ?? {
      productsCount: 0,
      paymentsCount: 0,
      totalCollected: "0.00"
    }
  };
}

function normalizeSearchValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getItemSearchText(item) {
  return [item.name, item.slug, item.description].filter(Boolean).join(" ").toLowerCase();
}

function getFilterButtonClass(isActive) {
  return isActive
    ? "inline-flex items-center rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-white shadow-sm"
    : "inline-flex items-center rounded-full border border-black/10 bg-white/95 px-4 py-2 text-sm font-medium text-black/80 transition hover:border-black/20 hover:text-ink";
}

export default function DashboardPageClient({
  initialUser,
  initialCsrfToken,
  initialDashboardData
}) {
  const router = useRouter();
  const detailPanelRef = useRef(null);
  const detailCacheRef = useRef(new Map());
  const normalizedDashboardData = normalizeDashboardData(initialDashboardData);
  const [user] = useState(initialUser);
  const [items, setItems] = useState(normalizedDashboardData.items);
  const [recentPayments, setRecentPayments] = useState(
    normalizedDashboardData.recentPayments
  );
  const [summary, setSummary] = useState(normalizedDashboardData.summary);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedForm, setSelectedForm] = useState(initialForm);
  const [selectedFieldErrors, setSelectedFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectionLoadingId, setSelectionLoadingId] = useState("");
  const [isClientReady, setIsClientReady] = useState(false);
  const [isDashboardPending, startDashboardTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    saveSession({
      user: initialUser,
      csrfToken: initialCsrfToken
    });
  }, [initialCsrfToken, initialUser]);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (!formMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setFormMessage("");
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formMessage]);

  function resetSelectedProduct() {
    setSelectedProductId("");
    setSelectedProduct(null);
    setSelectedForm(initialForm);
    setSelectedFieldErrors({});
    setSelectionLoadingId("");
  }

  function cacheSelectedProduct(product) {
    if (!product?.id) {
      return;
    }

    detailCacheRef.current.set(product.id, product);
  }

  function removeCachedProduct(productId) {
    if (!productId) {
      return;
    }

    detailCacheRef.current.delete(productId);
  }

  function getActiveCsrfToken() {
    return getCsrfToken() || initialCsrfToken;
  }

  function handleProtectedError(error, forbiddenMessage) {
    if (isUnauthorizedError(error)) {
      clearSession();
      router.replace("/login");
      return true;
    }

    if (isForbiddenError(error)) {
      setPageError(
        forbiddenMessage ??
          "Votre session a expire. Rechargez la page et reconnectez-vous si besoin."
      );
      return true;
    }

    return false;
  }

  function focusDetailPanel() {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1279px)").matches
    ) {
      detailPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  async function loadDashboardData() {
    const response = await apiRequest("/payment-links");

    startDashboardTransition(() => {
      setItems(response.items);
      setSummary(response.summary);
      setRecentPayments(response.recentPayments ?? []);
    });

    return response;
  }

  async function loadSelectedProductDetail(productId, options = {}) {
    const cachedProduct = options.forceRefresh
      ? null
      : detailCacheRef.current.get(productId);

    setDetailLoading(!cachedProduct);
    setSelectionLoadingId(cachedProduct ? "" : productId);
    setSelectedProductId(productId);

    if (cachedProduct) {
      startDashboardTransition(() => {
        setSelectedProduct(cachedProduct);
        setSelectedForm(buildProductForm(cachedProduct));
        setSelectedFieldErrors({});
      });

      if (options.focusPanel) {
        focusDetailPanel();
      }

      return;
    }

    try {
      const response = await apiRequest(`/payment-links/mine/${productId}`);
      cacheSelectedProduct(response.item);

      startDashboardTransition(() => {
        setSelectedProduct(response.item);
        setSelectedForm(buildProductForm(response.item));
        setSelectedFieldErrors({});
      });

      if (options.focusPanel) {
        focusDetailPanel();
      }
    } catch (error) {
      if (handleProtectedError(error)) {
        return;
      }

      if (isNotFoundError(error)) {
        removeCachedProduct(productId);
        resetSelectedProduct();
        setPageError("Ce lien n'est plus disponible dans votre espace vendeur.");
        return;
      }

      setPageError(error.message);
    } finally {
      setDetailLoading(false);
      setSelectionLoadingId("");
    }
  }

  async function refreshDashboard(focusProductId = selectedProductId, options = {}) {
    const response = await loadDashboardData();

    if (!focusProductId) {
      return;
    }

    const stillExists = response.items.some((item) => item.id === focusProductId);

    if (!stillExists) {
      resetSelectedProduct();
      return;
    }

    await loadSelectedProductDetail(focusProductId, {
      ...options,
      forceRefresh: true
    });
  }

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

  function handleSelectedFormChange(event) {
    const { name, value } = event.target;

    setSelectedForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));

    setSelectedFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: ""
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setPageError("");
    setFormMessage("");

    const validationErrors = validateProductForm(form);
    setFieldErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiRequest("/payment-links", {
        method: "POST",
        csrfToken: getActiveCsrfToken(),
        body: {
          name: form.name.trim(),
          price: form.price,
          description: form.description.trim()
        }
      });

      setForm(initialForm);
      setFieldErrors({});
      setFormMessage("Lien de paiement cree avec succes.");
      cacheSelectedProduct(response.item);
      await refreshDashboard(response.item.id, { focusPanel: true });
    } catch (error) {
      if (handleProtectedError(error)) {
        return;
      }

      setPageError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateSelectedProduct(event) {
    event.preventDefault();

    if (!selectedProductId) {
      return;
    }

    setPageError("");
    setFormMessage("");

    const validationErrors = validateProductForm(selectedForm);
    setSelectedFieldErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      return;
    }

    setSavingDetail(true);

    try {
      await apiRequest(`/payment-links/mine/${selectedProductId}`, {
        method: "PATCH",
        csrfToken: getActiveCsrfToken(),
        body: {
          name: selectedForm.name.trim(),
          price: selectedForm.price,
          description: selectedForm.description.trim()
        }
      });

      setFormMessage("Lien mis a jour avec succes.");
      removeCachedProduct(selectedProductId);
      await refreshDashboard(selectedProductId, { focusPanel: true });
    } catch (error) {
      if (handleProtectedError(error)) {
        return;
      }

      if (isNotFoundError(error)) {
        resetSelectedProduct();
        setPageError("Ce lien n'est plus disponible dans votre espace vendeur.");
        await loadDashboardData();
        return;
      }

      setPageError(error.message);
    } finally {
      setSavingDetail(false);
    }
  }

  async function handleToggleSelectedProductStatus() {
    if (!selectedProduct) {
      return;
    }

    setPageError("");
    setFormMessage("");
    setTogglingStatus(true);

    try {
      await apiRequest(`/payment-links/mine/${selectedProduct.id}/status`, {
        method: "PATCH",
        csrfToken: getActiveCsrfToken(),
        body: {
          isActive: !selectedProduct.isActive
        }
      });

      setFormMessage(
        selectedProduct.isActive
          ? "Lien desactive avec succes."
          : "Lien active avec succes."
      );
      removeCachedProduct(selectedProduct.id);
      await refreshDashboard(selectedProduct.id, { focusPanel: true });
    } catch (error) {
      if (handleProtectedError(error)) {
        return;
      }

      if (isNotFoundError(error)) {
        resetSelectedProduct();
        setPageError("Ce lien n'est plus disponible dans votre espace vendeur.");
        await loadDashboardData();
        return;
      }

      setPageError(error.message);
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleDeleteSelectedProduct() {
    if (!selectedProduct) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer definitivement le lien "${selectedProduct.name}" ?`
    );

    if (!confirmed) {
      return;
    }

    setPageError("");
    setFormMessage("");
    setDeletingProduct(true);

    try {
      await apiRequest(`/payment-links/mine/${selectedProduct.id}`, {
        method: "DELETE",
        csrfToken: getActiveCsrfToken()
      });

      removeCachedProduct(selectedProduct.id);
      resetSelectedProduct();
      setFormMessage("Lien supprime avec succes.");
      await loadDashboardData();
    } catch (error) {
      if (handleProtectedError(error)) {
        return;
      }

      if (isNotFoundError(error)) {
        resetSelectedProduct();
        setPageError("Ce lien n'est plus disponible dans votre espace vendeur.");
        await loadDashboardData();
        return;
      }

      setPageError(error.message);
    } finally {
      setDeletingProduct(false);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        csrfToken: getActiveCsrfToken()
      });
    } catch (error) {
      // Clearing the local session is enough if the backend session already expired.
    } finally {
      clearSession();
      router.replace("/login");
      router.refresh();
    }
  }

  const normalizedQuery = normalizeSearchValue(deferredQuery);
  const hasActiveFilters = normalizedQuery.length > 0 || statusFilter !== "ALL";
  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    const matchesQuery =
      normalizedQuery.length === 0 || getItemSearchText(item).includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
  const selectedListItem = items.find((item) => item.id === selectedProductId) ?? null;
  const activeItemsCount = items.filter((item) => item.status === "ACTIVE").length;
  const inactiveItemsCount = items.filter((item) => item.status === "INACTIVE").length;
  const stats = [
    { label: "Liens de paiement", value: summary.productsCount },
    { label: "Paiements recus", value: summary.paymentsCount },
    { label: "Montant collecte", value: formatPrice(summary.totalCollected) }
  ];

  return (
    <PageShell>
      <section className="space-y-8">
        <header className="surface-card overflow-hidden p-7 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="eyebrow">Dashboard vendeur</span>
              <div className="space-y-2">
                <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
                  {user ? `Bonjour ${user.fullName}` : "Votre espace vendeur"}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-black/72">
                  Creez un lien, modifiez-le, activez-le ou supprimez-le depuis le
                  meme espace tout en suivant vos paiements recus.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {publicRuntimeConfig.isPreProduction ? (
                    <span className="stage-pill">Experience pre-production</span>
                  ) : null}
                  <span className="info-pill">Donnees client masquees</span>
                </div>
              </div>
            </div>

            <button className="ghost-button w-full sm:w-auto" type="button" onClick={handleLogout}>
              Se deconnecter
            </button>
          </div>
        </header>

        {selectedListItem ? (
          <section className="surface-card p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="eyebrow">Edition en cours</span>
                  <StatusBadge status={selectedListItem.status} />
                </div>
                <h2 className="font-heading text-2xl font-semibold tracking-tight">
                  {selectedListItem.name}
                </h2>
                <p className="text-sm text-black/60">
                  {selectedListItem.paymentsCount} paiement(s) -{" "}
                  {formatPrice(selectedListItem.totalCollected)} collectes - cree le{" "}
                  {formatDateTime(selectedListItem.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/pay/${selectedListItem.slug}`}
                  prefetch={false}
                  target="_blank"
                  className="ghost-button"
                >
                  Ouvrir le lien public
                </Link>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => focusDetailPanel()}
                >
                  Aller au panneau de gestion
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {pageError ? (
          <p aria-live="polite" className="alert-error">
            {pageError}
          </p>
        ) : null}
        {formMessage ? (
          <p aria-live="polite" className="alert-success">
            {formMessage}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <article key={item.label} className="surface-card p-6">
              <p className="text-sm font-medium text-black/65">{item.label}</p>
              <p className="mt-4 font-heading text-4xl font-semibold">{item.value}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <section className="surface-card p-7 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-semibold">Nouveau lien</h2>
                  <p className="mt-3 text-sm leading-7 text-black/72">
                    Renseignez un nom, un prix et une description courte. Le lien sera
                    actif et accessible publiquement.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="info-pill">{activeItemsCount} actif(s)</span>
                  <span className="info-pill">{inactiveItemsCount} inactif(s)</span>
                </div>
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label className="label-text" htmlFor="product-name">
                    Nom du produit
                  </label>
                  <input
                    id="product-name"
                    className={`auth-input ${fieldErrors.name ? "input-error" : ""}`}
                    name="name"
                    type="text"
                    placeholder="Ex: T-shirt premium"
                    value={form.name}
                    disabled={!isClientReady || submitting}
                    onChange={handleChange}
                  />
                  {fieldErrors.name ? <p className="field-error">{fieldErrors.name}</p> : null}
                </div>

                <div>
                  <label className="label-text" htmlFor="product-price">
                    Prix
                  </label>
                  <input
                    id="product-price"
                    className={`auth-input ${fieldErrors.price ? "input-error" : ""}`}
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="25.00"
                    value={form.price}
                    disabled={!isClientReady || submitting}
                    onChange={handleChange}
                  />
                  {fieldErrors.price ? <p className="field-error">{fieldErrors.price}</p> : null}
                </div>

                <div>
                  <label className="label-text" htmlFor="product-description">
                    Description
                  </label>
                  <textarea
                    id="product-description"
                    className={`auth-input min-h-32 resize-none ${fieldErrors.description ? "input-error" : ""}`}
                    name="description"
                    placeholder="Quelques mots pour presenter le produit"
                    value={form.description}
                    disabled={!isClientReady || submitting}
                    onChange={handleChange}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-black/60">
                    <span>Simple et clair suffit pour ce MVP.</span>
                    <span>{form.description.length}/300</span>
                  </div>
                  {fieldErrors.description ? (
                    <p className="field-error">{fieldErrors.description}</p>
                  ) : null}
                </div>

                <button
                  className="primary-button w-full"
                  type="submit"
                  disabled={!isClientReady || submitting}
                >
                  {!isClientReady ? "Initialisation..." : submitting ? "Creation..." : "Creer le lien"}
                </button>
              </form>
            </section>

            <div ref={detailPanelRef} className="xl:sticky xl:top-6">
              <PaymentLinkDetailPanel
                item={selectedProduct}
                form={selectedForm}
                fieldErrors={selectedFieldErrors}
                loading={detailLoading}
                saving={savingDetail}
                togglingStatus={togglingStatus}
                deleting={deletingProduct}
                onChange={handleSelectedFormChange}
                onSubmit={handleUpdateSelectedProduct}
                onToggleStatus={handleToggleSelectedProductStatus}
                onDelete={handleDeleteSelectedProduct}
              />
            </div>
          </div>

          <div className="space-y-6">
            <section className="surface-card p-7 md:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-semibold">Liens de paiement</h2>
                  <p className="mt-2 text-sm text-black/68">
                    Recherchez, filtrez puis selectionnez un lien pour le gerer sans
                    perdre le contexte.
                  </p>
                </div>
                <p className="text-sm text-black/60">
                  {filteredItems.length} resultat(s) sur {items.length}
                </p>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <label className="label-text" htmlFor="payment-link-search">
                    Rechercher un lien
                  </label>
                  <input
                    id="payment-link-search"
                    className="auth-input"
                    type="search"
                    placeholder="Nom, slug ou description"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      className={getFilterButtonClass(statusFilter === filter.value)}
                      onClick={() => setStatusFilter(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      className="ghost-button px-4 py-2 text-sm"
                      onClick={() => {
                        setQuery("");
                        setStatusFilter("ALL");
                      }}
                    >
                      Reinitialiser
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-black/64">
                <p>
                  {isDashboardPending
                    ? "Mise a jour du dashboard en cours..."
                    : "Selectionnez un lien pour ouvrir son panneau detail sans quitter la liste."}
                </p>

                {selectedListItem ? (
                  <button type="button" className="ghost-button px-4 py-2 text-sm" onClick={focusDetailPanel}>
                    Voir le lien selectionne
                  </button>
                ) : null}
              </div>

              {filteredItems.length === 0 ? (
                <div className="muted-panel mt-6 p-8 text-sm leading-7 text-black/60">
                  {items.length === 0 ? (
                    <>
                      Aucun lien de paiement pour le moment. Creez votre premier produit
                      pour obtenir une page publique partageable.
                    </>
                  ) : (
                    <>
                      Aucun lien ne correspond a vos filtres actuels. Essayez une autre
                      recherche ou reinitialisez les filtres.
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {filteredItems.map((item) => (
                    <PaymentLinkCard
                      key={item.id}
                      item={item}
                      isSelected={selectedProductId === item.id}
                      isLoading={selectionLoadingId === item.id}
                      onSelect={() => {
                        if (selectedProductId === item.id && selectedProduct) {
                          focusDetailPanel();
                          return;
                        }

                        setPageError("");
                        setFormMessage("");
                        loadSelectedProductDetail(item.id, { focusPanel: true });
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="surface-card p-7 md:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-semibold">Paiements recus</h2>
                  <p className="mt-2 text-sm text-black/68">
                    Les 10 paiements les plus recents sur l'ensemble de vos liens.
                  </p>
                </div>
                <span className="text-sm text-black/60">
                  {recentPayments.length} paiement(s) affiche(s)
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="info-pill">Vue globale du compte</span>
                <span className="info-pill">Emails et telephones masques</span>
                {selectedListItem ? (
                  <span className="info-pill">
                    Lien selectionne: {selectedListItem.name}
                  </span>
                ) : null}
              </div>

              {recentPayments.length === 0 ? (
                <div className="muted-panel mt-6 p-8 text-sm leading-7 text-black/60">
                  Aucun paiement recu pour le moment. Quand un client paiera un lien,
                  vous verrez le montant et la reference ici.
                </div>
              ) : (
                <div className="mt-6 grid gap-3">
                  {recentPayments.map((payment) => (
                    <article
                      key={payment.id}
                      className="content-auto-card flex flex-col gap-4 rounded-[24px] border border-black/10 bg-black/[0.03] p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-ink">
                          {payment.product?.name || "Produit"}
                        </p>
                        <p className="text-sm text-black/62">{payment.reference}</p>
                        <p className="text-xs text-black/58">
                          {payment.customerName || "Client non renseigne"}
                          {payment.customerEmail ? ` - ${payment.customerEmail}` : ""}
                        </p>
                        <p className="text-xs text-black/56">
                          {formatDateTime(payment.paidAt || payment.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/pay/${payment.product?.slug}`}
                          prefetch={false}
                          target="_blank"
                          className="text-sm font-medium text-pine hover:text-brand-700"
                        >
                          Ouvrir le lien
                        </Link>
                        <StatusBadge status={payment.status} />
                        <p className="font-heading text-xl font-semibold">
                          {formatPrice(payment.amount)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
