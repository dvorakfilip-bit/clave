/** Vygeneruje časové sloty: začátek, délka, pauza, počet (PRD 5.4 – pomůcka pro sloty). */
export function generateSlotTimes(start: string, minutes: number, pause: number, count: number) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const fmt = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  const out: { startsAt: string; endsAt: string }[] = [];
  let cur = toMin(start);
  for (let i = 0; i < count; i++) {
    const end = cur + minutes;
    if (end >= 24 * 60) break;
    out.push({ startsAt: fmt(cur), endsAt: fmt(end) });
    cur = end + pause;
  }
  return out;
}

/** Všechna data mezi začátkem a koncem festivalu (YYYY-MM-DD). */
export function datesBetween(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (d <= last && out.length < 31) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export const RESERVED_SLUGS = ["admin", "prihlaseni", "auth", "api", "ucet", "_next"];
