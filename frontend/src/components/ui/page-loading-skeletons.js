import PageShell from "@/components/ui/page-shell";

function SkeletonBlock({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton-block ${className}`} />;
}

export function LandingRouteSkeleton() {
  return (
    <PageShell className="flex items-start">
      <section aria-busy="true" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="loading-surface">
            <div className="space-y-5">
              <SkeletonBlock className="h-8 w-40 rounded-full" />
              <div className="space-y-4">
                <SkeletonBlock className="h-16 w-full max-w-4xl" />
                <SkeletonBlock className="h-16 w-4/5 max-w-3xl" />
                <SkeletonBlock className="h-6 w-11/12 max-w-2xl" />
                <SkeletonBlock className="h-6 w-3/4 max-w-xl" />
              </div>
              <div className="flex flex-wrap gap-3">
                <SkeletonBlock className="h-12 w-36" />
                <SkeletonBlock className="h-12 w-40" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-28" />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="loading-surface">
              <SkeletonBlock className="h-5 w-44" />
              <div className="mt-5 grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-20" />
                ))}
              </div>
            </div>

            <div className="loading-surface">
              <SkeletonBlock className="h-5 w-48" />
              <div className="mt-5 flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-9 w-36 rounded-full" />
                ))}
              </div>
              <div className="mt-5 space-y-3">
                <SkeletonBlock className="h-5 w-full" />
                <SkeletonBlock className="h-5 w-4/5" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="loading-surface">
              <SkeletonBlock className="h-8 w-28 rounded-full" />
              <SkeletonBlock className="mt-5 h-10 w-3/4" />
              <div className="mt-3 space-y-3">
                <SkeletonBlock className="h-5 w-full" />
                <SkeletonBlock className="h-5 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function AuthRouteSkeleton() {
  return (
    <PageShell className="flex items-center justify-center">
      <section
        aria-busy="true"
        className="surface-card mx-auto w-full max-w-xl p-8 md:p-10"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SkeletonBlock className="h-8 w-24 rounded-full" />
            <div className="flex flex-wrap gap-2">
              <SkeletonBlock className="h-8 w-36 rounded-full" />
              <SkeletonBlock className="h-8 w-40 rounded-full" />
            </div>
          </div>

          <div className="space-y-3">
            <SkeletonBlock className="h-12 w-3/4" />
            <SkeletonBlock className="h-5 w-full" />
            <SkeletonBlock className="h-5 w-4/5" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24" />
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
          ))}
          <SkeletonBlock className="h-12 w-full" />
        </div>
      </section>
    </PageShell>
  );
}

export function DashboardRouteSkeleton() {
  return (
    <PageShell>
      <section aria-busy="true" className="space-y-8">
        <div className="loading-surface">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <SkeletonBlock className="h-8 w-36 rounded-full" />
              <SkeletonBlock className="h-14 w-full max-w-2xl" />
              <SkeletonBlock className="h-5 w-full max-w-3xl" />
              <SkeletonBlock className="h-5 w-4/5 max-w-2xl" />
            </div>
            <SkeletonBlock className="h-12 w-44" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="loading-surface">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="mt-4 h-12 w-28" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <div className="loading-surface">
              <SkeletonBlock className="h-10 w-40" />
              <div className="mt-3 space-y-3">
                <SkeletonBlock className="h-5 w-full" />
                <SkeletonBlock className="h-5 w-4/5" />
              </div>
              <div className="mt-6 space-y-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <SkeletonBlock className="h-4 w-24" />
                    <SkeletonBlock className="h-12 w-full" />
                  </div>
                ))}
                <SkeletonBlock className="h-12 w-full" />
              </div>
            </div>

            <div className="loading-surface">
              <SkeletonBlock className="h-10 w-36" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-24" />
                ))}
              </div>
              <div className="mt-6 space-y-5">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="loading-surface">
                <SkeletonBlock className="h-10 w-48" />
                <div className="mt-6 grid gap-4">
                  {Array.from({ length: 3 }).map((_, cardIndex) => (
                    <SkeletonBlock key={cardIndex} className="h-56" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function PaymentRouteSkeleton() {
  return (
    <PageShell className="flex items-center">
      <section
        aria-busy="true"
        className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="space-y-6">
          <div className="loading-surface">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-3">
                <SkeletonBlock className="h-8 w-36 rounded-full" />
                <SkeletonBlock className="h-8 w-40 rounded-full" />
                <SkeletonBlock className="h-8 w-44 rounded-full" />
              </div>
              <SkeletonBlock className="h-16 w-full max-w-3xl" />
              <SkeletonBlock className="h-16 w-4/5 max-w-2xl" />
              <SkeletonBlock className="h-6 w-full max-w-2xl" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonBlock className="h-32" />
            <SkeletonBlock className="h-32" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-36" />
            ))}
          </div>
        </div>

        <aside className="loading-surface">
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="mt-6 h-56 w-full" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="mt-6 h-12 w-full" />
          <SkeletonBlock className="mt-6 h-24 w-full" />
        </aside>
      </section>
    </PageShell>
  );
}
