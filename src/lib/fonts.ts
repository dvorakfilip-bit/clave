import { Inter, Montserrat, Nunito, Playfair_Display, Poppins } from "next/font/google";

// 5 písem s českou diakritikou, ze kterých vybírá organizátor (PRD 7.2).
// Soubory písma se stahují jen tehdy, když je stránka opravdu použije.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-poppins" });
const montserrat = Montserrat({ subsets: ["latin", "latin-ext"], variable: "--font-montserrat" });
const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair" });

export const FONTS = {
  inter: { label: "Inter", cssVar: "--font-inter" },
  poppins: { label: "Poppins", cssVar: "--font-poppins" },
  montserrat: { label: "Montserrat", cssVar: "--font-montserrat" },
  nunito: { label: "Nunito", cssVar: "--font-nunito" },
  playfair: { label: "Playfair Display", cssVar: "--font-playfair" },
} as const;

export type FontKey = keyof typeof FONTS;

export const fontVariables = [inter, poppins, montserrat, nunito, playfair].map((f) => f.variable).join(" ");

export function fontFamily(key: string) {
  const font = FONTS[key as FontKey] ?? FONTS.inter;
  return `var(${font.cssVar}), system-ui, sans-serif`;
}
