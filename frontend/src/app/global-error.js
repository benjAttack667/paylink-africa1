"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#f7f3ea] p-8 text-[#17231f]">
        <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/50">
            PayLink Africa
          </p>
          <h1 className="font-heading text-4xl font-semibold">Une erreur est survenue</h1>
          <p className="text-base leading-7 text-black/65">
            L’erreur a été enregistrée. Rechargez la page pour reprendre votre session.
          </p>
          <button className="primary-button w-fit" type="button" onClick={() => reset()}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
