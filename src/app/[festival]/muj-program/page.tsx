"use client";

import { useI18n } from "@/lib/i18n";

// Osobní program vyžaduje přihlášení – přijde v etapě 2.
export default function MyProgramPage() {
  const { t, locale } = useI18n();
  return (
    <div className="px-4 py-10 text-center">
      <h1 className="text-lg font-semibold">{t("myProgram")}</h1>
      <p className="mt-2 text-sm text-muted">
        {locale === "cs" ? "Přihlášení a osobní program připravujeme." : "Sign-in and personal program are coming soon."}
      </p>
    </div>
  );
}
