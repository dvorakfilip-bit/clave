import { overlaps, span } from "@/lib/time";
import type { FestivalProgram } from "@/lib/types";
import { type ImportRow, sameName } from "./format";

export type RowAction = "create" | "update" | "unchanged" | "error";

export interface PlannedRow {
  row: ImportRow;
  action: RowAction;
  errors: string[];
  /** Změněná pole u úpravy (pro náhled). */
  changes: string[];
}

export interface ImportPlan {
  rows: PlannedRow[];
  newRooms: string[];
  newStyles: string[];
  /** Učitelé z jiných festivalů na platformě, kteří se přidají k festivalu. */
  existingTeachers: { id: string; name: string }[];
  newTeachers: string[];
  newSlots: { date: string; start: string; end: string }[];
  /** Lekce a párty, které v souboru chybí – kandidáti ke smazání. */
  deleteCandidates: { kind: "lesson" | "party"; id: string; label: string }[];
  errorCount: number;
}

/** Barvy pro nově založené styly. */
export const STYLE_PALETTE = ["#E45756", "#3E9C4A", "#3F72AF", "#E08A1E", "#8E5BB5", "#1E9E9A", "#C2185B", "#7A6A2E"];

/**
 * Porovná řádky importu se stávajícím programem: co vznikne, co se změní, co chybí
 * a co je špatně. Používá se pro náhled i pro samotné provedení (PRD 5.4.1).
 */
export function buildPlan(p: FestivalProgram, rows: ImportRow[], platformTeachers: { id: string; name: string }[]): ImportPlan {
  const dayByDate = new Map(p.days.map((d) => [d.date, d]));
  const dateByDay = new Map(p.days.map((d) => [d.id, d.date]));
  const slotById = new Map(p.slots.map((s) => [s.id, s]));
  const findRoom = (name: string) => p.rooms.find((r) => sameName(r.name, name));
  const findStyle = (name: string) => p.styles.find((s) => sameName(s.name, name));
  const findTeacher = (name: string) => p.teachers.find((t) => sameName(t.name, name));

  const newRooms = new Map<string, string>();
  const newStyles = new Map<string, string>();
  const newTeachers = new Map<string, string>();
  const existingTeachers = new Map<string, { id: string; name: string }>();
  const newSlots = new Map<string, { date: string; start: string; end: string }>();
  const seenIds = new Set<string>();

  const planned: PlannedRow[] = rows.map((row) => {
    const errors = [...row.errors];
    const changes: string[] = [];

    if (row.date && !dayByDate.has(row.date)) errors.push(`den ${row.date} není v termínu festivalu`);

    let existing: { kind: "lesson" | "party"; id: string } | null = null;
    if (row.id) {
      if (seenIds.has(row.id)) errors.push("ID je v souboru dvakrát");
      seenIds.add(row.id);
      const lesson = p.lessons.find((l) => l.id === row.id);
      const party = p.parties.find((x) => x.id === row.id);
      if (row.kind === "lesson" && lesson) existing = { kind: "lesson", id: lesson.id };
      else if (row.kind === "party" && party) existing = { kind: "party", id: party.id };
      else errors.push("neznámé ID (smaž ho, pokud jde o novou položku)");
    }

    // Co se má založit, se počítá jen z bezchybných řádků.
    if (row.kind === "lesson" && !errors.length) {
      if (row.room && !findRoom(row.room)) newRooms.set(row.room.toLowerCase(), row.room);
      if (row.style && !findStyle(row.style)) newStyles.set(row.style.toLowerCase(), row.style);
      for (const name of row.teachers) {
        if (findTeacher(name)) continue;
        const onPlatform = platformTeachers.find((t) => sameName(t.name, name));
        if (onPlatform) existingTeachers.set(onPlatform.id, onPlatform);
        else newTeachers.set(name.toLowerCase(), name);
      }
      const day = dayByDate.get(row.date);
      if (day && row.start && row.end) {
        const daySlots = p.slots.filter((s) => s.dayId === day.id);
        const hasStart = daySlots.some((s) => s.startsAt === row.start);
        const hasEnd = daySlots.some((s) => s.endsAt === row.end);
        if (!hasStart || !hasEnd) newSlots.set(`${row.date} ${row.start}-${row.end}`, { date: row.date, start: row.start, end: row.end });
      }
    }

    if (existing && !errors.length) {
      if (existing.kind === "lesson") {
        const l = p.lessons.find((x) => x.id === existing!.id)!;
        const room = p.rooms.find((r) => r.id === l.roomId)?.name ?? "";
        const style = p.styles.find((s) => s.id === l.styleId)?.name ?? "";
        const teachers = l.teacherIds.map((t) => p.teachers.find((x) => x.id === t)?.name ?? "");
        if (dateByDay.get(l.dayId) !== row.date) changes.push("den");
        if (slotById.get(l.startSlotId)?.startsAt !== row.start || slotById.get(l.endSlotId)?.endsAt !== row.end) changes.push("čas");
        if (!sameName(room, row.room)) changes.push("místnost");
        if (!sameName(style, row.style)) changes.push("styl");
        if ((l.titleCs ?? "") !== row.titleCs || (l.titleEn ?? "") !== row.titleEn) changes.push("název");
        if (l.level !== row.level) changes.push("level");
        if (teachers.length !== row.teachers.length || teachers.some((t) => !row.teachers.some((r) => sameName(r, t)))) changes.push("učitelé");
        if ((l.descriptionCs ?? "") !== row.descriptionCs || (l.descriptionEn ?? "") !== row.descriptionEn) changes.push("popis");
      } else {
        const x = p.parties.find((y) => y.id === existing!.id)!;
        const place = x.roomId ? (p.rooms.find((r) => r.id === x.roomId)?.name ?? "") : (x.place ?? "");
        if (dateByDay.get(x.dayId) !== row.date) changes.push("den");
        if (x.startsAt !== row.start || (x.endsAt ?? "") !== row.end) changes.push("čas");
        if (!sameName(place, row.room)) changes.push("místo");
        if ((x.titleCs ?? "") !== row.titleCs || (x.titleEn ?? "") !== row.titleEn) changes.push("název");
        if ((x.descriptionCs ?? "") !== row.descriptionCs || (x.descriptionEn ?? "") !== row.descriptionEn) changes.push("popis");
      }
    }

    const action: RowAction = errors.length ? "error" : !existing ? "create" : changes.length ? "update" : "unchanged";
    return { row, action, errors, changes };
  });

  // Kolize ve výsledném programu: dvě lekce ve stejné místnosti a čase (PRD 5.4).
  const importedIds = new Set(rows.map((r) => r.id).filter(Boolean));
  const finalLessons: { key: string; date: string; room: string; range: [number, number]; ref: PlannedRow | null; label: string }[] = [];
  for (const l of p.lessons) {
    if (importedIds.has(l.id)) continue;
    finalLessons.push({
      key: l.id,
      date: dateByDay.get(l.dayId) ?? "",
      room: (p.rooms.find((r) => r.id === l.roomId)?.name ?? "").toLowerCase(),
      range: span(slotById.get(l.startSlotId)?.startsAt ?? "00:00", slotById.get(l.endSlotId)?.endsAt ?? "00:00"),
      ref: null,
      label: l.titleCs ?? l.titleEn ?? "",
    });
  }
  for (const pr of planned) {
    if (pr.row.kind !== "lesson" || pr.action === "error") continue;
    finalLessons.push({
      key: `line${pr.row.line}`,
      date: pr.row.date,
      room: pr.row.room.toLowerCase(),
      range: span(pr.row.start, pr.row.end),
      ref: pr,
      label: pr.row.titleCs || pr.row.titleEn,
    });
  }
  for (let i = 0; i < finalLessons.length; i++) {
    for (let j = i + 1; j < finalLessons.length; j++) {
      const a = finalLessons[i];
      const b = finalLessons[j];
      if (a.date !== b.date || a.room !== b.room || !overlaps(a.range, b.range)) continue;
      for (const [x, y] of [
        [a, b],
        [b, a],
      ]) {
        if (!x.ref) continue;
        x.ref.errors.push(`ve stejné místnosti a čase je „${y.label}“${y.ref ? ` (řádek ${y.ref.row.line})` : ""}`);
        x.ref.action = "error";
      }
    }
  }

  const deleteCandidates = [
    ...p.lessons.filter((l) => !importedIds.has(l.id)).map((l) => ({ kind: "lesson" as const, id: l.id, label: `${dateByDay.get(l.dayId)} ${slotById.get(l.startSlotId)?.startsAt} – ${l.titleCs ?? l.titleEn}` })),
    ...p.parties.filter((x) => !importedIds.has(x.id)).map((x) => ({ kind: "party" as const, id: x.id, label: `${dateByDay.get(x.dayId)} ${x.startsAt} – ${x.titleCs ?? x.titleEn} (párty)` })),
  ];

  return {
    rows: planned,
    newRooms: [...newRooms.values()],
    newStyles: [...newStyles.values()],
    existingTeachers: [...existingTeachers.values()],
    newTeachers: [...newTeachers.values()],
    newSlots: [...newSlots.values()],
    deleteCandidates,
    errorCount: planned.filter((r) => r.action === "error").length,
  };
}
