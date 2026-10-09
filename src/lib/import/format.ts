import type { FestivalProgram } from "@/lib/types";

/**
 * Formát šablony importu/exportu programu (PRD 5.4.1).
 * Jeden řádek = jedna lekce nebo párty.
 */
export const COLUMNS = [
  { key: "id", header: "ID", aliases: ["id"] },
  { key: "kind", header: "Typ", aliases: ["typ", "type"] },
  { key: "date", header: "Den", aliases: ["den", "datum", "date", "day"] },
  { key: "start", header: "Začátek", aliases: ["zacatek", "od", "start", "from"] },
  { key: "end", header: "Konec", aliases: ["konec", "do", "end", "to"] },
  { key: "room", header: "Místnost", aliases: ["mistnost", "sal", "room", "misto", "place"] },
  { key: "style", header: "Styl", aliases: ["styl", "style"] },
  { key: "titleCs", header: "Název CZ", aliases: ["nazev cz", "nazev", "title cz", "title cs"] },
  { key: "titleEn", header: "Název EN", aliases: ["nazev en", "title en", "title"] },
  { key: "level", header: "Level", aliases: ["level", "uroven"] },
  { key: "teachers", header: "Učitelé", aliases: ["ucitele", "ucitel", "teachers", "teacher"] },
  { key: "descriptionCs", header: "Popis CZ", aliases: ["popis cz", "popis", "description cz", "description cs"] },
  { key: "descriptionEn", header: "Popis EN", aliases: ["popis en", "description en", "description"] },
] as const;

export type ColumnKey = (typeof COLUMNS)[number]["key"];

export interface ImportRow {
  /** Číslo řádku v souboru (pro chybové hlášky). */
  line: number;
  id: string | null;
  kind: "lesson" | "party";
  date: string;
  start: string;
  end: string;
  room: string;
  style: string;
  titleCs: string;
  titleEn: string;
  level: number;
  teachers: string[];
  descriptionCs: string;
  descriptionEn: string;
  /** Chyby zjištěné už při čtení souboru. */
  errors: string[];
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export const sameName = (a: string, b: string) => normalize(a) === normalize(b);

export type Cell = string | number | boolean | Date | null | undefined;

const pad = (n: number) => String(n).padStart(2, "0");

/** Čas z buňky: „11:30“, „11.30“, Excel čas (zlomek dne) nebo Date. */
function toTime(v: Cell): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  if (typeof v === "number") {
    const minutes = Math.round((v % 1) * 24 * 60);
    return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
  }
  const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${pad(Number(m[1]))}:${m[2]}`;
}

/** Datum z buňky: „2027-07-06“, „6. 7. 2027“, „6.7.2027“, Excel datum nebo Date. */
function toDate(v: Cell): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return toDate(d);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
  m = s.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  return null;
}

const text = (v: Cell) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v).trim());

/** Převede tabulku (první řádek = hlavička) na řádky importu. */
export function parseTable(table: Cell[][]): { rows: ImportRow[]; error: string | null } {
  const headerIndex = table.findIndex((r) => r.some((c) => text(c) !== ""));
  if (headerIndex < 0) return { rows: [], error: "Soubor je prázdný." };
  const header = table[headerIndex].map((c) => normalize(text(c)));

  const col = new Map<ColumnKey, number>();
  for (const c of COLUMNS) {
    const i = header.findIndex((h) => h === normalize(c.header) || (c.aliases as readonly string[]).includes(h));
    if (i >= 0) col.set(c.key, i);
  }
  const missing = (["kind", "date", "start", "end"] as ColumnKey[]).filter((k) => !col.has(k));
  if (missing.length) {
    const names = missing.map((k) => COLUMNS.find((c) => c.key === k)!.header).join(", ");
    return { rows: [], error: `V hlavičce chybí sloupce: ${names}. Použij šablonu.` };
  }

  const get = (row: Cell[], key: ColumnKey) => (col.has(key) ? row[col.get(key)!] : undefined);
  const rows: ImportRow[] = [];

  table.slice(headerIndex + 1).forEach((r, i) => {
    if (!r.some((c) => text(c) !== "")) return;
    const errors: string[] = [];
    const kindText = normalize(text(get(r, "kind")));
    const kind = ["lekce", "lesson", "workshop", ""].includes(kindText) ? "lesson" : ["party", "party", "pary"].includes(kindText) ? "party" : null;
    if (!kind) errors.push(`neznámý typ „${text(get(r, "kind"))}“ (lekce / párty)`);

    const date = toDate(get(r, "date"));
    if (!date) errors.push("neplatné datum");
    const start = toTime(get(r, "start"));
    if (!start) errors.push("neplatný začátek");
    const end = toTime(get(r, "end"));
    if (!end && kind !== "party") errors.push("neplatný konec");

    const levelText = text(get(r, "level")).replace(",", ".");
    const level = levelText === "" ? 0 : Number(levelText);
    if (kind === "lesson" && (Number.isNaN(level) || level < 0 || level > 3 || (level * 2) % 1 !== 0)) {
      errors.push("level musí být 0–3 po 0,5");
    }

    const row: ImportRow = {
      line: headerIndex + i + 2,
      id: text(get(r, "id")) || null,
      kind: kind ?? "lesson",
      date: date ?? "",
      start: start ?? "",
      end: end ?? "",
      room: text(get(r, "room")),
      style: text(get(r, "style")),
      titleCs: text(get(r, "titleCs")),
      titleEn: text(get(r, "titleEn")),
      level: Number.isNaN(level) ? 0 : level,
      teachers: text(get(r, "teachers"))
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean),
      descriptionCs: text(get(r, "descriptionCs")),
      descriptionEn: text(get(r, "descriptionEn")),
      errors,
    };
    if (!row.titleCs && !row.titleEn) errors.push("chybí název");
    if (row.kind === "lesson" && !row.room) errors.push("chybí místnost");
    if (row.kind === "lesson" && !row.teachers.length) errors.push("chybí učitel");
    if (row.kind === "party" && !row.room) errors.push("chybí místo");
    if (row.kind === "lesson" && row.start && row.end && row.end <= row.start) errors.push("konec je před začátkem");
    rows.push(row);
  });

  return { rows, error: rows.length ? null : "V souboru nejsou žádné řádky s programem." };
}

/** Aktuální program jako tabulka ve formátu šablony (export s ID). */
export function programToTable(p: FestivalProgram): string[][] {
  const day = new Map(p.days.map((d) => [d.id, d.date]));
  const slot = new Map(p.slots.map((s) => [s.id, s]));
  const room = new Map(p.rooms.map((r) => [r.id, r.name]));
  const style = new Map(p.styles.map((s) => [s.id, s.name]));
  const teacher = new Map(p.teachers.map((t) => [t.id, t.name]));
  const lvl = (n: number) => String(n).replace(".", ",");

  const lessons = [...p.lessons]
    .sort((a, b) => (day.get(a.dayId) ?? "").localeCompare(day.get(b.dayId) ?? "") || (slot.get(a.startSlotId)?.startsAt ?? "").localeCompare(slot.get(b.startSlotId)?.startsAt ?? ""))
    .map((l) => [
      l.id,
      "lekce",
      day.get(l.dayId) ?? "",
      slot.get(l.startSlotId)?.startsAt ?? "",
      slot.get(l.endSlotId)?.endsAt ?? "",
      room.get(l.roomId) ?? "",
      l.styleId ? (style.get(l.styleId) ?? "") : "",
      l.titleCs ?? "",
      l.titleEn ?? "",
      lvl(l.level),
      l.teacherIds.map((t) => teacher.get(t) ?? "").join(", "),
      l.descriptionCs ?? "",
      l.descriptionEn ?? "",
    ]);
  const parties = p.parties.map((x) => [
    x.id,
    "párty",
    day.get(x.dayId) ?? "",
    x.startsAt,
    x.endsAt ?? "",
    x.roomId ? (room.get(x.roomId) ?? "") : (x.place ?? ""),
    "",
    x.titleCs ?? "",
    x.titleEn ?? "",
    "",
    "",
    x.descriptionCs ?? "",
    x.descriptionEn ?? "",
  ]);
  return [COLUMNS.map((c) => c.header), ...lessons, ...parties];
}

/** Prázdná šablona s ukázkovými řádky. */
export function templateTable(p: FestivalProgram): string[][] {
  const date = p.days[0]?.date ?? p.festival.startDate;
  const room = p.rooms[0]?.name ?? "Sál A";
  const style = p.styles[0]?.name ?? "Salsa";
  return [
    COLUMNS.map((c) => c.header),
    ["", "lekce", date, "11:30", "12:30", room, style, "Otočkové kombinace", "Turn patterns", "1,5", "Ana Ruiz", "", ""],
    ["", "lekce", date, "12:40", "14:50", room, style, "Workshop přes dva sloty", "Two-slot workshop", "2", "Ana Ruiz, Tomás Kern", "", ""],
    ["", "párty", date, "22:00", "04:00", "Beach bar", "", "Uvítací párty", "Welcome party", "", "", "", ""],
  ];
}

/** Prompt pro organizátorovu vlastní AI – převod PDF / obrázku programu na CSV šablonu (PRD 5.4.1). */
export function aiPrompt(p: FestivalProgram): string {
  const list = (items: string[]) => (items.length ? items.map((i) => `"${i}"`).join(", ") : "(zatím žádné – použij názvy z podkladu)");
  return `Převeď přiložený program tanečního festivalu do CSV tabulky pro import do aplikace Clave.

Výstup: pouze CSV (oddělovač čárka, hodnoty s čárkou v uvozovkách), první řádek je hlavička přesně v tomto pořadí:
${COLUMNS.map((c) => c.header).join(",")}

Pravidla pro sloupce:
- ID: nech prázdné.
- Typ: "lekce" pro lekci/workshop, "párty" pro večerní párty.
- Den: datum ve tvaru RRRR-MM-DD. Festival trvá od ${p.festival.startDate} do ${p.festival.endDate}.
- Začátek, Konec: čas ve tvaru HH:MM (24h). Párty může končit po půlnoci (např. 22:00–04:00).
- Místnost: název sálu. Používej přesně tyto existující názvy, pokud odpovídají: ${list(p.rooms.map((r) => r.name))}. U párty lze napsat i jiné místo.
- Styl: taneční styl. Existující styly: ${list(p.styles.map((s) => s.name))}.
- Název CZ, Název EN: název lekce česky a anglicky (pokud je jen jeden jazyk, druhý nech prázdný).
- Level: obtížnost 0 až 3 v krocích po 0,5 (0 = začátečníci / pro všechny, 3 = nejpokročilejší). Pokud podklad level neuvádí, napiš 0.
- Učitelé: jména oddělená čárkou. Existující učitelé: ${list(p.teachers.map((t) => t.name))}. Piš jména přesně stejně.
- Popis CZ, Popis EN: krátký popis, pokud je v podkladu, jinak prázdné.

Každá lekce bude na samostatném řádku. Nic nevynechávej a nic si nevymýšlej – co v podkladu není, nech prázdné.`;
}
