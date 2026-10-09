"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackIcon, ShareIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n";

/** Nadpis podstránky s tlačítkem zpět a volitelným sdílením odkazu (PRD 5.1 – Sdílení). */
export function PageHeader({ title, fallbackHref, share = false }: { title: string; fallbackHref: string; share?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex items-center gap-2 px-2 py-3">
      <button
        onClick={() => (window.history.length > 1 ? router.back() : router.push(fallbackHref))}
        className="rounded-full p-1.5 text-muted"
        aria-label={t("back")}
      >
        <BackIcon />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      {share && (
        <button onClick={onShare} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs">
          <ShareIcon />
          {copied ? t("linkCopied") : t("share")}
        </button>
      )}
    </div>
  );
}
