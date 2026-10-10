// 5 písem s českou diakritikou, ze kterých vybírá organizátor (PRD 7.2).
// Samotné načtení písem je v fonts.ts (jen na serveru, v kořenovém layoutu).
export const FONTS = {
  inter: { label: "Inter", cssVar: "--font-inter" },
  poppins: { label: "Poppins", cssVar: "--font-poppins" },
  montserrat: { label: "Montserrat", cssVar: "--font-montserrat" },
  nunito: { label: "Nunito", cssVar: "--font-nunito" },
  playfair: { label: "Playfair Display", cssVar: "--font-playfair" },
} as const;

export type FontKey = keyof typeof FONTS;

export function fontFamily(key: string) {
  const font = FONTS[key as FontKey] ?? FONTS.inter;
  return `var(${font.cssVar}), system-ui, sans-serif`;
}
