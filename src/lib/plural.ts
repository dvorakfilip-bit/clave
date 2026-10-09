const rules = new Intl.PluralRules("cs");

/** České skloňování podle počtu: [1, 2–4, 0 a 5+], např. ["lekce", "lekce", "lekcí"]. */
export function csCount(n: number, [one, few, other]: [string, string, string]) {
  const rule = rules.select(n);
  return `${n} ${rule === "one" ? one : rule === "few" ? few : other}`;
}
