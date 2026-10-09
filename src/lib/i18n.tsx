"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Locale } from "./types";

const dict = {
  cs: {
    festivals: "Festivaly",
    upcoming: "Aktuální a nadcházející",
    archive: "Archiv",
    noFestivals: "Zatím tu nejsou žádné festivaly.",
    program: "Program",
    myProgram: "Můj program",
    teachers: "Učitelé",
    more: "Více",
    filters: "Filtry",
    clearFilters: "Zrušit filtry",
    style: "Styl",
    room: "Místnost",
    teacher: "Učitel",
    level: "Level",
    all: "Vše",
    grid: "Mřížka",
    list: "Seznam",
    changed: "Změna",
    cancelled: "Zrušeno",
    now: "Teď",
    party: "Párty",
    allLevels: "Pro všechny úrovně",
    lessonsOf: "Lekce",
    back: "Zpět",
    share: "Sdílet",
    linkCopied: "Odkaz zkopírován",
    noLessons: "Filtrům neodpovídá žádná lekce.",
    info: "Praktické informace",
    language: "Jazyk",
    notFound: "Festival nenalezen",
    nextDay: "+1",
    loading: "Načítám…",
  },
  en: {
    festivals: "Festivals",
    upcoming: "Current and upcoming",
    archive: "Archive",
    noFestivals: "No festivals yet.",
    program: "Program",
    myProgram: "My program",
    teachers: "Teachers",
    more: "More",
    filters: "Filters",
    clearFilters: "Clear filters",
    style: "Style",
    room: "Room",
    teacher: "Teacher",
    level: "Level",
    all: "All",
    grid: "Grid",
    list: "List",
    changed: "Changed",
    cancelled: "Cancelled",
    now: "Now",
    party: "Party",
    allLevels: "All levels",
    lessonsOf: "Classes",
    back: "Back",
    share: "Share",
    linkCopied: "Link copied",
    noLessons: "No classes match the filters.",
    info: "Practical info",
    language: "Language",
    notFound: "Festival not found",
    nextDay: "+1",
    loading: "Loading…",
  },
} as const;

export type MessageKey = keyof (typeof dict)["cs"];

interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey) => string;
  /** Vybere text v jazyce uživatele, chybí-li překlad, vrátí originál (PRD 6.3). */
  pick: (cs: string | null | undefined, en: string | null | undefined) => string;
}

const Ctx = createContext<I18n | null>(null);
const STORAGE_KEY = "clave.locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("cs");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const initial = stored === "cs" || stored === "en" ? stored : navigator.language.startsWith("cs") ? "cs" : "en";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- jazyk je známý až v prohlížeči
    setLocaleState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback((key: MessageKey) => dict[locale][key], [locale]);
  const pick = useCallback(
    (cs: string | null | undefined, en: string | null | undefined) =>
      (locale === "cs" ? (cs ?? en) : (en ?? cs)) ?? "",
    [locale],
  );

  return <Ctx.Provider value={{ locale, setLocale, t, pick }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n mimo I18nProvider");
  return ctx;
}
