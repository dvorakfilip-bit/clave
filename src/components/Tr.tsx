"use client";

import { useI18n } from "@/lib/i18n";

/** Krátký text rozhraní v jazyce uživatele pro serverové komponenty: <Tr cs="Načítám…" en="Loading…" />. */
export function Tr({ cs, en }: { cs: string; en: string }) {
  const { tr } = useI18n();
  return <>{tr(cs, en)}</>;
}
