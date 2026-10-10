import { Inter, Montserrat, Nunito, Playfair_Display, Poppins } from "next/font/google";

// Soubory písma se stahují jen tehdy, když je stránka opravdu použije. Seznam písem: font-list.ts.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-poppins" });
const montserrat = Montserrat({ subsets: ["latin", "latin-ext"], variable: "--font-montserrat" });
const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair" });

export const fontVariables = [inter, poppins, montserrat, nunito, playfair].map((f) => f.variable).join(" ");
