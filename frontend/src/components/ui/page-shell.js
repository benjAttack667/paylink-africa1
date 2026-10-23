import Link from "next/link";
import { ArrowUpRight, Link2 } from "lucide-react";
import { publicRuntimeConfig } from "@/lib/runtime-config";

export default function PageShell({ children, className = "" }) {
  return (
    <main className={`relative min-h-screen overflow-hidden px-4 py-4 md:px-10 md:py-8 ${className}`}>
      <div
        aria-hidden="true"
        className="absolute left-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-brand-100/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-[-5rem] top-24 h-64 w-64 rounded-full bg-slate-200/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-5rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/60 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-8">
          <Link href="/" className="brand-mark w-fit">
            <span className="feature-icon-shell h-9 w-9 rounded-full border-none bg-pine text-white shadow-none">
              <Link2 size={16} />
            </span>
            <span>PayLink Africa</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Navigation principale" className="hidden items-center gap-1 rounded-full border border-black/10 bg-white/60 p-1 text-sm shadow-sm backdrop-blur md:flex">
              <Link href="/#fonctionnement" className="rounded-full px-3 py-2 text-black/60 hover:bg-white hover:text-ink">
                Fonctionnement
              </Link>
              <Link href="/login" className="rounded-full px-3 py-2 text-black/60 hover:bg-white hover:text-ink">
                Se connecter
              </Link>
            </nav>
            <span
              className={
                publicRuntimeConfig.isPreProduction ? "stage-pill" : "stage-pill stage-pill-live"
              }
            >
              {publicRuntimeConfig.siteStageLabel}
            </span>
            <Link href="/register" className="ghost-button hidden gap-1 px-4 py-2 md:inline-flex">
              Commencer <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        <div className="relative">{children}</div>

        <footer className="mt-8 flex flex-col gap-3 border-t border-black/10 pt-5 text-xs text-black/45 sm:flex-row sm:items-center sm:justify-between">
          <span>PayLink Africa · Paiements plus simples pour les vendeurs africains</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Infrastructure sécurisée
          </span>
        </footer>
      </div>
    </main>
  );
}
