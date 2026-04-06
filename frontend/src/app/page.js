import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Link2,
  Quote,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import PageShell from "@/components/ui/page-shell";

const steps = [
  {
    step: "01",
    title: "Creer le lien",
    description: "Le vendeur ajoute un produit, un prix et une description claire en quelques secondes."
  },
  {
    step: "02",
    title: "Partager partout",
    description: "Le lien circule facilement dans WhatsApp, Instagram, email ou tout echange client."
  },
  {
    step: "03",
    title: "Recevoir et suivre",
    description: "Le client paie sur une page rassurante, puis le vendeur retrouve tout dans son dashboard."
  }
];

const convictions = [
  "La revolution ne commence pas quand la technologie devient plus lourde. Elle commence quand le progres devient enfin simple a utiliser.",
  "Chaque paiement plus fluide, c'est un commerce qui avance plus vite.",
  "Le vrai progres n'ajoute pas de friction. Il en retire."
];

const trustItems = [
  {
    icon: Smartphone,
    title: "Pensé pour le mobile",
    description: "Un parcours lisible et rapide, meme quand toute la vente se joue sur smartphone."
  },
  {
    icon: CreditCard,
    title: "Parcours de paiement clair",
    description: "Le client voit le produit, le montant et le vendeur avant de continuer."
  },
  {
    icon: BarChart3,
    title: "Suivi vendeur direct",
    description: "Liens, statuts et paiements recus restent visibles dans un seul espace."
  }
];

export default function HomePage() {
  return (
    <PageShell className="flex items-start">
      <section className="space-y-6 md:space-y-8">
        <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="surface-card-dark p-6 md:p-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow border-white/15 bg-white/10 text-white/85 shadow-none">
                  PayLink Africa
                </span>
                <span className="info-pill border-white/10 bg-white/10 text-white/75 shadow-none">
                  Liens de paiement pour vendeurs africains
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl font-heading text-4xl font-bold leading-[1.02] tracking-tight text-white md:text-7xl">
                  Recevoir un paiement doit ressembler a un progres, pas a un obstacle.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/78 md:text-xl md:leading-8">
                  PayLink Africa aide les vendeurs qui concluent deja leurs ventes dans
                  la conversation a partager un lien plus propre, plus credible et plus
                  rapide a utiliser.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/register" className="primary-button w-full sm:w-auto">
                  Creer mon espace vendeur
                </Link>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/14 bg-white/10 px-5 py-3 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/16 sm:w-auto"
                >
                  Explorer le dashboard
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="hero-proof-card">
                  <div className="feature-icon-shell-dark">
                    <ShieldCheck size={20} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">
                    Un paiement plus rassurant cree plus de confiance.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    Le lien montre le produit, le prix et le vendeur avant toute action.
                  </p>
                </div>
                <div className="hero-proof-card">
                  <div className="feature-icon-shell-dark">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">
                    Une fois partage, le lien devient un vrai outil commercial.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    Le vendeur suit ensuite les paiements recus depuis le meme espace.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="surface-card p-6 md:p-8">
              <div className="flex items-start gap-4">
                <span className="feature-icon-shell text-pine">
                  <Quote size={20} />
                </span>
                <div>
                  <span className="eyebrow">Notre conviction</span>
                  <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-ink">
                    Le vrai changement commence quand le paiement devient aussi simple que la conversation.
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm leading-7 text-black/68 md:text-base">
                <p>
                  Beaucoup de ventes se concluent deja dans un message, dans une
                  conversation directe, dans un echange ou la confiance existe deja.
                  Ce qui manque souvent, ce n'est pas le client. C'est une facon plus
                  propre de finir le parcours.
                </p>
                <p>
                  PayLink Africa est ne de cette vision: aider les vendeurs a faire
                  passer leur commerce d'une vente informelle a une experience plus
                  solide, plus professionnelle et plus rassurante.
                </p>
              </div>
            </div>

            <div className="surface-card p-6 md:p-8">
              <span className="eyebrow">Ce que cette vision veut dire</span>
              <div className="mt-5 space-y-3">
                {convictions.map((quote) => (
                  <blockquote key={quote} className="premium-quote">
                    <p className="text-sm leading-7 text-black/72 md:text-base">{quote}</p>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="surface-card p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="eyebrow">Comment ca marche</span>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                Un parcours simple, pense pour faire avancer le commerce.
              </h2>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-pine transition hover:text-brand-700"
            >
              Acceder au dashboard <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((item) => (
              <article
                key={item.step}
                className="rounded-[1.75rem] border border-black/10 bg-white/82 p-5 shadow-sm backdrop-blur"
              >
                <span className="feature-icon-shell bg-ink text-white shadow-none">
                  {item.step}
                </span>
                <h3 className="mt-4 font-heading text-xl font-semibold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-black/65">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="surface-card p-6 md:p-7">
                <span className="feature-icon-shell text-pine">
                  <Icon size={20} />
                </span>
                <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-black/65">{item.description}</p>
              </article>
            );
          })}
        </section>

        <section className="surface-card p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="eyebrow">L'histoire derriere le produit</span>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                Une vue simple: aider les vendeurs a passer d'un echange a un progres concret.
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-7 text-black/68 md:text-base">
              <p>
                Derriere PayLink Africa, il y a une reflexion tres simple: beaucoup de
                vendeurs n'ont pas besoin d'une machine lourde. Ils ont besoin d'un
                outil qui leur permet d'avancer, sans casser leur rythme, sans compliquer
                leur relation client.
              </p>
              <p>
                Cette plateforme a donc ete pensee comme un pas vers plus de
                professionnalisme, plus de confiance et plus de progression. Une petite
                revolution utile, construite pour rendre chaque vente un peu plus forte
                que la precedente.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="primary-button w-full sm:w-auto">
              Commencer comme vendeur
            </Link>
            <Link href="/login" className="ghost-button w-full sm:w-auto">
              Voir l'espace vendeur
            </Link>
          </div>
        </section>
      </section>
    </PageShell>
  );
}
