"use client";

import { useI18n } from "@/lib/i18n";

// Neočekávaná chyba ve správě (např. výpadek sítě při načítání) – místo prázdné stránky nabídnout opakování.
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <p className="font-semibold">{tr("Něco se nepovedlo.", "Something went wrong.")}</p>
      <p className="text-sm text-muted">
        {tr("Zkontroluj připojení k internetu a zkus to znovu.", "Check your internet connection and try again.")}
      </p>
      <button onClick={reset} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-on-brand">
        {tr("Zkusit znovu", "Try again")}
      </button>
    </div>
  );
}
