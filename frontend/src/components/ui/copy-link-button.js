"use client";

import { useEffect, useState } from "react";

export default function CopyLinkButton({
  path,
  className = "ghost-button",
  idleLabel = "Copier le lien",
  successLabel = "Lien copie",
  errorLabel = "Copie indisponible"
}) {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (status === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status]);

  async function handleCopy() {
    if (
      typeof window === "undefined" ||
      !window.navigator?.clipboard ||
      typeof window.navigator.clipboard.writeText !== "function"
    ) {
      setStatus("error");
      return;
    }

    try {
      const absoluteUrl = new URL(path, window.location.origin).toString();
      await window.navigator.clipboard.writeText(absoluteUrl);
      setStatus("success");
    } catch (error) {
      setStatus("error");
    }
  }

  const label =
    status === "success"
      ? successLabel
      : status === "error"
        ? errorLabel
        : idleLabel;

  const statusClassName =
    status === "success"
      ? " border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
      : status === "error"
        ? " border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
        : "";

  return (
    <button
      className={`${className}${statusClassName}`}
      type="button"
      onClick={handleCopy}
      aria-live="polite"
    >
      {label}
    </button>
  );
}
