"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

/** Přepínač CZ / EN – po změně obnoví stránku, aby i texty ze serveru byly ve zvoleném jazyce. */
export function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        setLocale(locale === "cs" ? "en" : "cs");
        router.refresh();
      }}
      className="rounded-lg border border-line px-2.5 py-1"
      aria-label={locale === "cs" ? "Switch to English" : "Přepnout do češtiny"}
    >
      {locale === "cs" ? "EN" : "CZ"}
    </button>
  );
}
