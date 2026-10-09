import type { Locale } from "./types";

/** Aktuální datum (YYYY-MM-DD) a čas (HH:MM) v časovém pásmu festivalu (PRD 5.1). */
export function nowInZone(timeZone: string, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const localeTag = (l: Locale) => (l === "cs" ? "cs-CZ" : "en-GB");

// Datum festivalu je kalendářní den bez času – formátujeme v UTC, aby se neposunul.
const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

export function formatDay(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(asDate(iso));
}

export function formatDayLong(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(asDate(iso));
}

export function formatRange(start: string, end: string, locale: Locale) {
  const f = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(localeTag(locale), { ...opts, timeZone: "UTC" }).format(asDate(iso));
  if (start === end) return f(start, { day: "numeric", month: "numeric", year: "numeric" });
  return `${f(start, { day: "numeric", month: "numeric" })} – ${f(end, { day: "numeric", month: "numeric", year: "numeric" })}`;
}

/** Konec po půlnoci se zobrazí s „(+1)“ (PRD 5.1). */
export function crossesMidnight(start: string, end: string | null) {
  return end !== null && end < start;
}
