import type { Festival } from "./types";

/** Název pod ikonou na ploše: zadaný organizátorem, jinak první slova názvu (max. 15 znaků). */
export function shortName(f: Pick<Festival, "name" | "shortName">): string {
  if (f.shortName) return f.shortName;
  if (f.name.length <= 15) return f.name;
  let out = "";
  for (const word of f.name.split(/\s+/)) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 15) break;
    out = next;
  }
  return out || f.name.slice(0, 15);
}
