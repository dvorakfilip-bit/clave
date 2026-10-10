import { describe, expect, it } from "vitest";
import { layoutGrid } from "./grid";
import type { Lesson, TimeSlot } from "./types";

const slots: TimeSlot[] = [
  { id: "s1", dayId: "d", startsAt: "10:00", endsAt: "11:00" },
  { id: "s2", dayId: "d", startsAt: "11:10", endsAt: "12:10" },
  { id: "s3", dayId: "d", startsAt: "12:20", endsAt: "13:20" },
];

const lesson = (id: string, from: string, to: string, extra: Partial<Lesson> = {}): Lesson => ({
  id,
  dayId: "d",
  startSlotId: from,
  endSlotId: to,
  roomId: "r",
  styleId: null,
  titleCs: id,
  titleEn: null,
  descriptionCs: null,
  descriptionEn: null,
  level: 0,
  cancelled: false,
  changedAt: null,
  teacherIds: [],
  ...extra,
});

describe("layoutGrid – mřížka čas × místnost", () => {
  it("vícehodinová lekce zabere i další buňky", () => {
    const { cells, covered } = layoutGrid([lesson("w", "s1", "s2")], slots);
    expect(cells.get("0:r")?.span).toBe(2);
    expect(covered.has("1:r")).toBe(true);
    expect(covered.has("2:r")).toBe(false);
  });

  it("náhrada za zrušenou lekci je v buňce, zrušená jako poznámka pod ní", () => {
    const { cells } = layoutGrid([lesson("zrusena", "s2", "s2", { cancelled: true }), lesson("nahrada", "s2", "s2")], slots);
    expect(cells.get("1:r")?.lesson.id).toBe("nahrada");
    expect(cells.get("1:r")?.replaced.map((l) => l.id)).toEqual(["zrusena"]);
  });

  it("zrušená lekce bez náhrady zůstane na svém místě", () => {
    const { cells } = layoutGrid([lesson("zrusena", "s3", "s3", { cancelled: true })], slots);
    expect(cells.get("2:r")?.lesson.cancelled).toBe(true);
  });

  it("zrušený workshop pod kratší náhradou", () => {
    const { cells } = layoutGrid([lesson("workshop", "s1", "s2", { cancelled: true }), lesson("nahrada", "s2", "s2")], slots);
    expect(cells.get("1:r")?.replaced.map((l) => l.id)).toEqual(["workshop"]);
    expect(cells.has("0:r")).toBe(false);
  });
});
