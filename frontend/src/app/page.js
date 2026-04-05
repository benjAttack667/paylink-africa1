import Link from "next/link";
import PageShell from "@/components/ui/page-shell";

const quickLinks = [
  { href: "/register", label: "Creer un compte vendeur", helper: "Ouvrir votre espace de vente" },
  { href: "/login", label: "Connexion vendeur", helper: "Retrouver votre activite" },
  { href: "/dashboard", label: "Dashboard", helper: "Piloter liens et paiements" },
  { href: "/pay/demo-link", label: "Page publique", helper: "Voir l'experience client" }
];

const highlights = [
  {
    title: "Rapide a deployer",
    description: "Le vendeur publie un lien en quelques instants et le partage sans passer par une integration complexe."
  },
  {
    title: "Rassurant pour le client",
    description: "Le parcours a ete pense pour inspirer confiance avec une page claire, lisible et accessible sur mobile."
  },
  {
    title: "Pret a grandir",
    description: "La base technique est propre, securisee et deja structuree pour evoluer vers un vrai produit en production."
  }
];

const stats = [
  { label: "Temps pour publier", value: "< 2 min" },
  { label: "Experience couverte", value: "Vendeur + client" },
  { label: "Base produit", value: "Fiable et scalable" }
];

const confidenceSignals = [
  "Parcours vendeur et client deja relies",
  "Design responsive sur mobile, tablette et ordinateur",
  "Base prete pour activer le paiement live au bon moment"
];

const previewItems = [
  { label: "Lien actif", value: "Collection capsule", helper: "Page publique partageable" },
  { label: "Montant", value: "25 000 FCFA", helper: "Montant clair avant redirection" },
  { label: "Statut", value: "Paiement verifie", helper: "Confirmation serveur en fin de parcours" }
];

const storyMoments = [
  {
    label: "Le terrain",
    title: "La vente commence souvent dans une conversation.",
    description:
      "Sur WhatsApp, Instagram ou par email, beaucoup de ventes avancent vite, puis ralentissent au moment de demander comment payer."
  },
  {
    label: "Le besoin",
    title: "Le bon lien peut faire gagner du temps et de la confiance.",
    description:
      "Quand le paiement devient simple a envoyer, simple a ouvrir et simple a comprendre, la conversion devient plus naturelle."
  },
  {
    label: "La reponse",
    title: "PayLink Africa transforme ce moment en experience propre.",
    description:
      "Le vendeur cree son produit, recupere une page publique professionnelle et suit ensuite son activite depuis un dashboard simple."
  }
];

const usageSteps = [
  {
    step: "01",
    title: "Ouvrir son espace vendeur",
    description:
      "Le vendeur cree son compte, se connecte et retrouve un espace unique pour publier ses offres et suivre son activite."
  },
  {
    step: "02",
    title: "Publier une offre en quelques secondes",
    description:
      "Il renseigne le nom du produit, le prix et la description. La plateforme genere ensuite une page publique prete a etre partagee."
  },
  {
    step: "03",
    title: "Suivre les encaissements avec clarte",
    description:
      "Le client ouvre le lien, voit clairement ce qu'il paie, puis le vendeur retrouve les paiements, l'historique et les statuts dans son dashboard."
  }
];

const useCases = [
  "Vente sociale sur WhatsApp, Instagram ou Facebook",
  "Facturation simple pour independants et petites equipes",
  "Encaissement rapide avant integration payment live"
];

export default function HomePage() {
  return (
    <PageShell className="flex items-start">
      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="surface-card-dark p-8 md:p-10">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow border-white/15 bg-white/10 text-white/85 shadow-none">
                  Payment Links MVP
                </span>
                <span className="info-pill border-white/10 bg-white/10 text-white/75 shadow-none">
                  Concu pour la vente conversationnelle
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl font-heading text-5xl font-semibold leading-[0.98] tracking-tight text-white md:text-7xl">
                  Une facon simple, credible et moderne d'encaisser en ligne.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-white/78">
                  Concu pour les vendeurs qui concluent leurs ventes dans la
                  conversation et veulent envoyer un lien propre, rassurant et
                  professionnel en quelques secondes.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ink shadow-[0_18px_38px_rgba(7,10,12,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-brand-50"
                  href="/register"
                >
                  Creer mon espace vendeur
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-2xl border border-white/14 bg-white/10 px-5 py-3 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/16"
                  href="/login"
                >
                  Acceder au dashboard
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-2xl border border-white/14 bg-transparent px-5 py-3 text-sm font-medium text-white/80 transition duration-200 hover:-translate-y-0.5 hover:bg-white/8 hover:text-white"
                  href="#histoire"
                >
                  Comprendre le projet
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <article key={item.label} className="hero-metric">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                      {item.label}
                    </p>
                    <p className="mt-3 font-heading text-2xl font-semibold text-white">
                      {item.value}
                    </p>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {confidenceSignals.map((signal) => (
                  <div
                    key={signal}
                    className="rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-4 text-sm leading-6 text-white/72 backdrop-blur"
                  >
                    {signal}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="surface-card p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.25em] text-black/50">
                    Parcours disponibles
                  </p>
                  <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-ink">
                    Une experience simple a montrer, simple a partager.
                  </h2>
                </div>
                <span className="hidden rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 md:inline-flex">
                  Workflow
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {quickLinks.map((item, index) => (
                  <Link key={item.href} href={item.href} className="quick-link-card">
                    <div className="flex items-start gap-4">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 font-heading text-sm font-semibold text-brand-700">
                        0{index + 1}
                      </span>
                      <div>
                        <p>{item.label}</p>
                        <p className="mt-1 text-xs font-normal text-black/50">{item.helper}</p>
                      </div>
                    </div>
                    <span className="text-black/35">{"->"}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
              <div className="soft-accent-card soft-accent-card-amber">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-black/50">
                  Ce que vous obtenez deja
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="info-pill">Espace vendeur securise</span>
                  <span className="info-pill">Page de paiement publique</span>
                  <span className="info-pill">Suivi des paiements recus</span>
                  <span className="info-pill">Mode demonstration pret au live</span>
                </div>

                <p className="mt-5 text-sm leading-7 text-black/65">
                  Le MVP a ete pense pour inspirer confiance des les premiers clics,
                  tout en gardant une base technique serieuse pour aller ensuite vers
                  une vraie mise en production.
                </p>
              </div>

              <div className="surface-card border-pine/10 bg-white/95 p-6 md:p-7">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-black/45">
                  Apercu du parcours
                </p>
                <div className="mt-5 rounded-[1.75rem] bg-gradient-to-br from-pine via-ink to-pine p-5 text-white shadow-[0_18px_44px_rgba(16,16,16,0.18)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                        Vendeur
                      </p>
                      <p className="mt-2 font-heading text-2xl font-semibold">
                        Paiement partage en un lien
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                      Preview
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {previewItems.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[1.35rem] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                          {item.label}
                        </p>
                        <p className="mt-2 font-heading text-xl font-semibold text-white">
                          {item.value}
                        </p>
                        <p className="mt-1 text-sm text-white/65">{item.helper}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, index) => (
            <article
              key={item.title}
              className={`p-6 md:p-7 ${
                index === 0
                  ? "soft-accent-card soft-accent-card-amber"
                  : index === 1
                    ? "soft-accent-card soft-accent-card-pine"
                    : "surface-card"
              }`}
            >
              <span className="eyebrow">Point fort</span>
              <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/65">{item.description}</p>
            </article>
          ))}
        </div>

        <section id="histoire" className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="surface-card p-8 md:p-10">
            <span className="eyebrow">L'histoire du produit</span>
            <div className="mt-5 space-y-5">
              <h2 className="max-w-3xl font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                Un produit pense pour rendre le paiement plus simple au bon moment.
              </h2>

              <p className="max-w-3xl text-base leading-8 text-black/68 md:text-lg">
                PayLink Africa est ne d'une realite tres concrete: beaucoup de ventes
                se jouent deja dans un message, une discussion ou une relance client.
                Le besoin n'est pas abstrait. Il apparait a l'instant ou le client dit
                simplement: j'aime, je veux acheter, comment je paie ?
              </p>

              <p className="max-w-3xl text-base leading-8 text-black/68 md:text-lg">
                L'ambition du produit est donc claire: offrir aux vendeurs une facon
                plus professionnelle d'encaisser, sans casser leur rythme de vente,
                sans friction technique et sans interface inutilement lourde.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {storyMoments.map((item) => (
                <article key={item.title} className="rounded-[1.75rem] border border-black/10 bg-white/75 p-5 backdrop-blur">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-black/45">
                    {item.label}
                  </p>
                  <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-black/65">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="surface-card p-6 md:p-8">
              <span className="eyebrow">Comment l'utiliser</span>
              <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-ink">
                Trois gestes, un parcours fluide.
              </h2>

              <div className="mt-5 space-y-4">
                {usageSteps.map((item) => (
                  <article
                    key={item.step}
                    className="rounded-[1.75rem] border border-black/10 bg-white/80 p-5 backdrop-blur"
                  >
                    <div className="flex items-start gap-4">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-sm font-semibold text-white shadow-sm">
                        {item.step}
                      </span>

                      <div>
                        <h3 className="font-heading text-xl font-semibold tracking-tight text-ink">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-black/65">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="surface-card p-6 md:p-8">
              <span className="eyebrow">Pour qui</span>
              <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-ink">
                Une base utile des la premiere vente.
              </h2>

              <div className="mt-5 flex flex-wrap gap-2">
                {useCases.map((item) => (
                  <span key={item} className="info-pill">
                    {item}
                  </span>
                ))}
              </div>

              <p className="mt-5 text-sm leading-7 text-black/65">
                Si vous vendez deja en direct avec vos clients, cette plateforme vous
                aide a rendre le paiement plus propre, plus rassurant et plus simple a
                suivre, avec une image plus serieuse des le premier partage.
              </p>
            </div>
          </div>
        </section>
      </section>
    </PageShell>
  );
}
