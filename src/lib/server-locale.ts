import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "./types";

/** Jazyk uživatele na serveru (cookie nastavuje přepínač jazyka v prohlížeči). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("clave-locale")?.value;
  return value === "en" ? "en" : "cs";
}

/** Text ve správném jazyce pro serverové akce a stránky: await m("Uloženo", "Saved"). */
export async function m(cs: string, en: string): Promise<string> {
  return (await getLocale()) === "en" ? en : cs;
}
