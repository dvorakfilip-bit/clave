"use client";

import Link from "next/link";
import { ClaveLogo } from "@/components/ClaveLogo";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export interface LegalSection {
  title: string;
  body: React.ReactNode;
}

/** Jednoduchá textová stránka v obou jazycích (zásady, o aplikaci). */
export function LegalPage({ content }: { content: Record<Locale, { title: string; updated?: string; sections: LegalSection[] }> }) {
  const { locale, setLocale } = useI18n();
  const c = content[locale];
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ClaveLogo size={26} />
          clave
        </Link>
        <button onClick={() => setLocale(locale === "cs" ? "en" : "cs")} className="rounded-lg border border-line px-2.5 py-1 text-xs">
          {locale === "cs" ? "English" : "Čeština"}
        </button>
      </div>
      <h1 className="text-2xl font-semibold">{c.title}</h1>
      {c.updated && <p className="mt-1 text-xs text-muted">{c.updated}</p>}
      <div className="mt-6 space-y-6">
        {c.sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-2 font-semibold">{s.title}</h2>
            <div className="space-y-2 text-sm leading-relaxed [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">{s.body}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
