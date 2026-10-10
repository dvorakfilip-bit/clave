import type { Lesson, TimeSlot } from "./types";

export interface GridCell {
  lesson: Lesson;
  /** Počet řádků (slotů), přes které lekce v mřížce sahá. */
  span: number;
  /** Zrušené lekce na stejném místě, které lekce nahradila – zobrazí se pod ní. */
  replaced: Lesson[];
}

/**
 * Rozložení lekcí jednoho dne do mřížky čas × místnost. Klíč buňky je `${index slotu}:${id místnosti}`.
 * Zrušená lekce může mít na svém místě náhradu (PRD 5.3) – pak se ukáže jen jako poznámka pod ní.
 */
export function layoutGrid(lessons: Lesson[], slots: TimeSlot[]) {
  const slotIndex = new Map(slots.map((s, i) => [s.id, i]));
  const cells = new Map<string, GridCell>();
  const covered = new Set<string>();
  const owner = new Map<string, GridCell>();

  // Probíhající lekce mají přednost před zrušenými.
  const ordered = [...lessons].sort((a, b) => Number(a.cancelled) - Number(b.cancelled));
  for (const l of ordered) {
    const from = slotIndex.get(l.startSlotId);
    if (from === undefined) continue;
    const to = Math.max(from, slotIndex.get(l.endSlotId) ?? from);
    const keys = Array.from({ length: to - from + 1 }, (_, i) => `${from + i}:${l.roomId}`);
    const taken = keys.map((k) => owner.get(k)).find(Boolean);
    if (taken) {
      taken.replaced.push(l);
      continue;
    }
    const cell: GridCell = { lesson: l, span: to - from + 1, replaced: [] };
    cells.set(keys[0], cell);
    for (const k of keys) owner.set(k, cell);
    for (const k of keys.slice(1)) covered.add(k);
  }
  return { cells, covered };
}
