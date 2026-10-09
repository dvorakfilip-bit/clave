import { DARK_BG, DARK_SURFACE, mix, textOn } from "./color";
import type { Style } from "./types";

/**
 * Převede 1–5 barev festivalu na CSS proměnné pro světlý i tmavý režim
 * (PRD 7.2). Chybějící barvy se dopočítají z hlavní barvy.
 */
export function festivalThemeCss(colors: string[], selector: string): string {
  const primary = colors[0] ?? "#C8102E";
  const accent = colors[1] ?? mix(primary, "#ffffff", 0.35);
  const highlight = colors[2] ?? primary;
  const bg = colors[3] ?? mix(primary, "#ffffff", 0.96);
  const text = colors[4] ?? "#1b1b1b";

  const light = {
    "--brand": primary,
    "--on-brand": textOn(primary),
    "--accent": accent,
    "--accent-soft": mix(accent, "#ffffff", 0.75),
    "--highlight": highlight,
    "--on-highlight": textOn(highlight),
    "--page": bg,
    "--surface": "#ffffff",
    "--ink": text,
    "--muted": mix(text, bg, 0.45),
    "--line": mix(text, bg, 0.85),
  };
  const darkAccent = mix(accent, "#ffffff", 0.2);
  const darkHighlight = mix(highlight, "#ffffff", 0.15);
  const dark = {
    "--brand": primary,
    "--on-brand": textOn(primary),
    "--accent": darkAccent,
    "--accent-soft": mix(accent, DARK_SURFACE, 0.75),
    "--highlight": darkHighlight,
    "--on-highlight": textOn(darkHighlight),
    "--page": mix(primary, DARK_BG, 0.94),
    "--surface": DARK_SURFACE,
    "--ink": "#ececec",
    "--muted": "#9a9aa2",
    "--line": "#33333a",
  };

  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v};`)
      .join("");
  return `${selector}{${block(light)}}@media (prefers-color-scheme: dark){${selector}{${block(dark)}}}`;
}

/** Barvy karty lekce podle stylu – jemné podbarvení, čitelný text v obou režimech (PRD 7.4). */
export function styleCss(styles: Style[]): string {
  const light = styles
    .map((s) => `[data-style="${s.id}"]{--style:${s.color};--style-bg:${mix(s.color, "#ffffff", 0.84)};--style-ink:${mix(s.color, "#000000", 0.45)};}`)
    .join("");
  const dark = styles
    .map((s) => `[data-style="${s.id}"]{--style:${mix(s.color, "#ffffff", 0.15)};--style-bg:${mix(s.color, DARK_SURFACE, 0.72)};--style-ink:${mix(s.color, "#ffffff", 0.7)};}`)
    .join("");
  return `${light}@media (prefers-color-scheme: dark){${dark}}`;
}
