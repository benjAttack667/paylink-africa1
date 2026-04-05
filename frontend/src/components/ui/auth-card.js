import Link from "next/link";

const trustPoints = [
  "Dashboard vendeur simple",
  "Paiements verifies cote serveur",
  "Parcours clair sur mobile"
];

export default function AuthCard({
  badge,
  title,
  description,
  footerLabel,
  footerHref,
  footerText,
  children
}) {
  return (
    <section className="surface-card mx-auto w-full max-w-5xl overflow-hidden p-0">
      <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
        <div className="surface-card-dark p-8 md:p-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow border-white/15 bg-white/10 text-white/85 shadow-none">
                {badge}
              </span>
              <span className="info-pill border-white/10 bg-white/10 text-white/75 shadow-none">
                Espace vendeur
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {title}
              </h1>
              <p className="max-w-xl text-sm leading-7 text-white/72">{description}</p>
            </div>

            <div className="grid gap-3">
              {trustPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-4 text-sm leading-6 text-white/74 backdrop-blur"
                >
                  {point}
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="hero-metric">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">Promesse</p>
                <p className="mt-3 text-sm leading-6 text-white/82">
                  Un parcours simple a ouvrir, simple a comprendre et simple a suivre.
                </p>
              </div>
              <div className="hero-metric">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">Usage</p>
                <p className="mt-3 text-sm leading-6 text-white/82">
                  Pense pour le mobile, sans complexite inutile pour le vendeur.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="eyebrow">Acces securise</span>
              <div className="flex flex-wrap gap-2">
                {trustPoints.slice(0, 2).map((point) => (
                  <span key={point} className="info-pill">
                    {point}
                  </span>
                ))}
              </div>
            </div>

            <div className="soft-accent-card soft-accent-card-amber">
              <p className="text-sm leading-7 text-black/65">
                Retrouvez vos liens de paiement, vos encaissements et vos actions de
                gestion dans un seul espace clair.
              </p>
            </div>
          </div>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-sm text-black/60">
            {footerText}{" "}
            <Link className="font-medium text-pine hover:text-brand-700" href={footerHref}>
              {footerLabel}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
