import Link from "next/link";
import { Link2 } from "lucide-react";
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

          <div className="flex flex-wrap gap-2">
            <span
              className={
                publicRuntimeConfig.isPreProduction ? "stage-pill" : "stage-pill stage-pill-live"
              }
            >
              {publicRuntimeConfig.siteStageLabel}
            </span>
          </div>
        </div>

        <div className="relative">{children}</div>
      </div>
    </main>
  );
}
