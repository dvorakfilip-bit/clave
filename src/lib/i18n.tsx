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
    want: "Chci jít",
    wanted: "V mém programu",
    signIn: "Přihlásit se",
    signOut: "Odhlásit se",
    account: "Účet",
    signedInAs: "Přihlášen(a) jako",
    deleteAccount: "Smazat účet",
    deleteAccountConfirm: "Opravdu smazat účet? Smaže se i tvůj osobní program na všech festivalech. Nelze vrátit.",
    signInToSave: "Pro vlastní program se přihlas – výběr se ti uloží a uvidíš ho na všech zařízeních.",
    myProgramEmpty: "Zatím nemáš vybranou žádnou lekci. V programu klikni na srdíčko u lekcí, na které chceš jít.",
    conflictWith: "Překrývá se s:",
    conflictConfirm: "Lekce se časově překrývá s tvým výběrem",
    addAnyway: "Přesto přidat?",
    conflict: "Kolize",
    changesTitle: "Změny ve tvém programu",
    changesSince: "Od tvé poslední návštěvy se změnilo:",
    understood: "Rozumím",
    offlineSave: "Výběr se nepodařilo uložit. Zkontroluj připojení k internetu.",
    manageFestival: "Spravovat festival",
    teacherProfile: "Můj profil učitele",
    offlineBanner: "Jsi offline – zobrazuji program uložený v telefonu.",
    about: "O aplikaci",
    privacy: "Ochrana osobních údajů",
    madeWithAi: "Vytvořeno s pomocí AI (Claude od Anthropic).",
    signInConsent: "Přihlášením bereš na vědomí",
    privacyLink: "zásady ochrany osobních údajů",
    installTitle: "Přidat na plochu",
    installText: "Program pak otevřeš jedním klepnutím jako aplikaci a funguje i bez signálu.",
    installButton: "Přidat na plochu",
    installIos: "V Safari klepni na Sdílet (čtverec se šipkou) a vyber „Přidat na plochu“.",
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
    want: "Want to go",
    wanted: "In my program",
    signIn: "Sign in",
    signOut: "Sign out",
    account: "Account",
    signedInAs: "Signed in as",
    deleteAccount: "Delete account",
    deleteAccountConfirm: "Delete your account? Your personal program on all festivals will be deleted too. This can't be undone.",
    signInToSave: "Sign in to build your own program – it's saved and available on all your devices.",
    myProgramEmpty: "You haven't picked any classes yet. Tap the heart on classes you want to attend.",
    conflictWith: "Overlaps with:",
    conflictConfirm: "This class overlaps with your selection",
    addAnyway: "Add anyway?",
    conflict: "Overlap",
    changesTitle: "Changes in your program",
    changesSince: "Changed since your last visit:",
    understood: "Got it",
    offlineSave: "Couldn't save your selection. Check your internet connection.",
    manageFestival: "Manage festival",
    teacherProfile: "My teacher profile",
    offlineBanner: "You're offline – showing the program saved on your phone.",
    about: "About",
    privacy: "Privacy policy",
    madeWithAi: "Built with the help of AI (Claude by Anthropic).",
    signInConsent: "By signing in you acknowledge the",
    privacyLink: "privacy policy",
    installTitle: "Add to home screen",
    installText: "Open the program with one tap like an app – it works without signal too.",
    installButton: "Add to home screen",
    installIos: "In Safari tap Share (square with an arrow) and choose “Add to Home Screen”.",
  },
} as const;

export type MessageKey = keyof (typeof dict)["cs"];

// Tvary podle Intl.PluralRules: cs = one (1) / few (2–4) / many (desetinná) / other (0, 5+)
const plurals = {
  cs: { lesson: { one: "lekce", few: "lekce", many: "lekce", other: "lekcí" } },
  en: { lesson: { one: "class", other: "classes" } },
} as const;

export type PluralKey = keyof (typeof plurals)["cs"];

interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey) => string;
  /** Počet se správně vyskloňovaným slovem, např. „3 lekce“, „5 lekcí“. */
  count: (n: number, key: PluralKey) => string;
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
  const count = useCallback(
    (n: number, key: PluralKey) => {
      const forms: Partial<Record<Intl.LDMLPluralRule, string>> = plurals[locale][key];
      const rule = new Intl.PluralRules(locale).select(n);
      return `${n} ${forms[rule] ?? forms.other}`;
    },
    [locale],
  );
  const pick = useCallback(
    (cs: string | null | undefined, en: string | null | undefined) =>
      (locale === "cs" ? (cs ?? en) : (en ?? cs)) ?? "",
    [locale],
  );

  return <Ctx.Provider value={{ locale, setLocale, t, count, pick }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n mimo I18nProvider");
  return ctx;
}
