import { contrast, mix } from "./color";
import { festivalPalette } from "./theme";

export interface PaletteWarning {
  /** Index barvy (0–4), které se varování týká. */
  index: number;
  message: string;
  /** Navržená upravená barva, se kterou je kombinace čitelná. */
  suggestion: string;
}

/** Ztmaví nebo zesvětlí barvu po malých krocích, dokud nemá vůči `against` požadovaný kontrast. */
export function adjustToContrast(color: string, against: string, ratio: number): string {
  const towards = contrast(against, "#000000") > contrast(against, "#ffffff") ? "#000000" : "#ffffff";
  for (let i = 1; i <= 20; i++) {
    const candidate = mix(color, towards, i * 0.05);
    if (contrast(candidate, against) >= ratio) return candidate.toUpperCase();
  }
  return towards.toUpperCase();
}

/**
 * Kontrola čitelnosti barev festivalu podle WCAG AA (PRD 7.3):
 * běžný text 4,5 : 1, ovládací prvky a velký text 3 : 1.
 */
export function paletteWarnings(colors: string[], locale: "cs" | "en"): PaletteWarning[] {
  const tr = (cs: string, en: string) => (locale === "cs" ? cs : en);
  const { light: v } = festivalPalette(colors);
  const warnings: PaletteWarning[] = [];

  if (contrast(v["--on-brand"], v["--brand"]) < 4.5) {
    warnings.push({
      index: 0,
      message: tr("Text v hlavičce na hlavní barvě bude špatně čitelný.", "Header text on the primary color will be hard to read."),
      suggestion: adjustToContrast(v["--brand"], v["--on-brand"], 4.5),
    });
  }
  if (contrast(v["--brand"], v["--page"]) < 3) {
    warnings.push({
      index: colors[3] ? 3 : 0,
      message: tr(
        "Hlavní barva málo vyniká na pozadí stránky (tlačítka, vybraný den).",
        "The primary color doesn't stand out enough on the page background (buttons, selected day).",
      ),
      suggestion: colors[3] ? adjustToContrast(v["--page"], v["--brand"], 3) : adjustToContrast(v["--brand"], v["--page"], 3),
    });
  }
  if (colors[2] && contrast(v["--highlight"], v["--surface"]) < 3) {
    warnings.push({
      index: 2,
      message: tr(
        "Zvýrazňující barva (štítek Změna, srdíčko) je na bílé kartě málo vidět.",
        "The highlight color (Changed label, heart) is hard to see on a white card.",
      ),
      suggestion: adjustToContrast(v["--highlight"], v["--surface"], 3),
    });
  }
  if (contrast(v["--ink"], v["--page"]) < 4.5) {
    warnings.push({
      index: colors[4] ? 4 : 3,
      message: tr("Text je na pozadí stránky špatně čitelný.", "Text is hard to read on the page background."),
      suggestion: colors[4] ? adjustToContrast(v["--ink"], v["--page"], 4.5) : adjustToContrast(v["--page"], v["--ink"], 4.5),
    });
  }
  if (colors[1] && contrast(v["--ink"], v["--page"]) >= 4.5 && contrast(v["--ink"], v["--accent-soft"]) < 4.5) {
    warnings.push({
      index: 1,
      message: tr(
        "Text na podbarvení párty (doplňková barva) bude špatně čitelný.",
        "Text on the party background (secondary color) will be hard to read.",
      ),
      suggestion: adjustToContrast(v["--accent"], "#ffffff", 3),
    });
  }
  return warnings;
}
