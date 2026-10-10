import { describe, expect, it } from "vitest";
import { demoProgram as p } from "@/lib/demo-data";
import { aiPrompt, type Cell, parseTable, programToTable, templateTable } from "./format";
import { buildPlan } from "./plan";

/** Načte tabulku a sestaví plán importu proti ukázkovému festivalu. */
function plan(table: Cell[][], locale: "cs" | "en" = "cs", platform: { id: string; name: string }[] = []) {
  const { rows, error } = parseTable(table, locale);
  if (error) throw new Error(error);
  const result = buildPlan(p, rows, platform, locale);
  const count = (a: string) => result.rows.filter((r) => r.action === a).length;
  return { ...result, created: count("create"), updated: count("update"), unchanged: count("unchanged"), errors: count("error") };
}

const copy = (t: string[][]) => t.map((r) => [...r]);
const lessonCount = p.lessons.length + p.parties.length;

describe("export a zpětný import (PRD 5.4.1)", () => {
  it.each(["cs", "en"] as const)("export v jazyce %s se načte beze změn", (locale) => {
    const result = plan(programToTable(p, locale), locale);
    expect(result.unchanged).toBe(lessonCount);
    expect(result.created + result.updated + result.errors).toBe(0);
    expect(result.deleteCandidates).toHaveLength(0);
  });

  it("anglický export jde nahrát v české správě a naopak", () => {
    expect(plan(programToTable(p, "en"), "cs").unchanged).toBe(lessonCount);
    expect(plan(programToTable(p, "cs"), "en").unchanged).toBe(lessonCount);
  });
});

describe("poznání změn podle ID", () => {
  it("změna levelu a názvu je úprava, ne nová lekce", () => {
    const t = copy(programToTable(p, "cs"));
    t[1][9] = "2,5";
    t[1][7] = "Nový název";
    const result = plan(t);
    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(result.rows.find((r) => r.action === "update")?.changes).toEqual(expect.arrayContaining(["název", "level"]));
  });

  it("řádek bez ID je nová lekce", () => {
    const t = copy(programToTable(p, "cs"));
    t.push(["", "lekce", "2027-07-06", "15:00", "16:00", "Terasa", "Salsa", "Nová lekce", "", "1", "Ana Ruiz", "", ""]);
    expect(plan(t).created).toBe(1);
  });

  it("chybějící řádky jsou kandidáti ke smazání", () => {
    const t = programToTable(p, "cs").slice(0, 5);
    expect(plan(t).deleteCandidates).toHaveLength(lessonCount - 4);
  });

  it("neznámé ID je chyba", () => {
    const t = copy(programToTable(p, "cs"));
    t[1][0] = "00000000-0000-4000-8000-ffffffffffff";
    expect(plan(t).errors).toBe(1);
  });

  it("stejné ID dvakrát je chyba", () => {
    const t = copy(programToTable(p, "cs"));
    t.push([...t[1]]);
    expect(plan(t).errors).toBeGreaterThan(0);
  });
});

describe("kolize (jedna lekce v jednom sále a čase)", () => {
  it("přesun lekce do obsazeného sálu je chyba u obou řádků", () => {
    const t = copy(programToTable(p, "cs"));
    const occupied = t.find((r, i) => i > 1 && r[2] === t[1][2] && r[3] === t[1][3] && r[5] !== t[1][5])!;
    t[1][5] = occupied[5];
    expect(plan(t).errors).toBe(2);
  });

  it("workshop přes víc slotů koliduje s lekcí uvnitř", () => {
    const t = copy(programToTable(p, "cs"));
    t.push(["", "lekce", "2027-07-06", "11:30", "13:40", "Sál A", "Salsa", "Dlouhý workshop", "", "1", "Ana Ruiz", "", ""]);
    expect(plan(t).errors).toBeGreaterThan(0);
  });
});

describe("čtení tabulky", () => {
  it("české hlavičky, české datum a čas s tečkou", () => {
    const result = plan([
      ["Typ", "Den", "Od", "Do", "Sál", "Název", "Učitel", "Level"],
      ["Lekce", "6. 7. 2027", "9.00", "10:00", "Nový sál", "Ranní jóga", "Nová Učitelka", "0"],
    ]);
    expect(result.created).toBe(1);
    expect(result.newRooms).toEqual(["Nový sál"]);
    expect(result.newTeachers).toEqual(["Nová Učitelka"]);
    expect(result.newSlots).toEqual([{ date: "2027-07-06", start: "09:00", end: "10:00" }]);
  });

  it("anglické hlavičky a typy", () => {
    const result = plan(
      [
        ["Type", "Day", "Start", "End", "Room", "Title EN", "Teachers", "Level"],
        ["class", "2027-07-06", "09:00", "10:00", "Sál A", "Morning yoga", "Ana Ruiz", "1.5"],
      ],
      "en",
    );
    expect(result.created).toBe(1);
    expect(result.rows[0].row.level).toBe(1.5);
  });

  it("Excel čas a datum jako čísla", () => {
    const result = plan([
      ["Typ", "Den", "Začátek", "Konec", "Místnost", "Název CZ", "Učitelé"],
      ["lekce", 46574, 0.375, 0.41666666666666669, "Sál A", "Ranní lekce", "Ana Ruiz"],
    ]);
    expect(result.rows[0].row.date).toBe("2027-07-06");
    expect(result.rows[0].row.start).toBe("09:00");
    expect(result.rows[0].row.end).toBe("10:00");
  });

  it("párty přes půlnoc není chyba", () => {
    const result = plan([
      ["Typ", "Den", "Začátek", "Konec", "Místnost", "Název CZ"],
      ["párty", "2027-07-06", "22:00", "04:00", "Beach bar", "Noční párty"],
    ]);
    expect(result.errors).toBe(0);
  });

  it("neplatné řádky dostanou srozumitelné chyby", () => {
    const result = plan([
      ["Typ", "Den", "Začátek", "Konec", "Místnost", "Název CZ", "Učitelé", "Level"],
      ["lekce", "2030-01-01", "25:00", "x", "", "", "", "9"],
      ["foo", "2027-07-06", "10:00", "11:00", "Sál A", "A", "Ana Ruiz", "1"],
    ]);
    expect(result.errors).toBe(2);
    const messages = result.rows.flatMap((r) => r.errors).join(" ");
    expect(messages).toMatch(/začátek/);
    expect(messages).toMatch(/level/);
    expect(messages).toMatch(/2030-01-01/);
  });

  it("chybí povinné sloupce", () => {
    expect(parseTable([["Název"], ["A"]], "cs").error).toBeTruthy();
  });

  it("učitel z jiného festivalu se najde na platformě", () => {
    const result = plan(
      [
        ["Typ", "Den", "Začátek", "Konec", "Místnost", "Název CZ", "Učitelé"],
        ["lekce", "2027-07-06", "09:00", "10:00", "Sál A", "Host", "Marta Nová"],
      ],
      "cs",
      [{ id: "t-1", name: "Marta Nová" }],
    );
    expect(result.existingTeachers).toEqual([{ id: "t-1", name: "Marta Nová" }]);
    expect(result.newTeachers).toEqual([]);
  });
});

describe("šablona a prompt pro AI", () => {
  it.each(["cs", "en"] as const)("ukázkové řádky šablony (%s) jdou nahrát", (locale) => {
    const { rows, error } = parseTable(templateTable(p, locale), locale);
    expect(error).toBeNull();
    expect(rows.every((r) => r.errors.length === 0)).toBe(true);
  });

  it("prompt obsahuje existující sály, styly a učitele", () => {
    const prompt = aiPrompt(p, "cs");
    for (const name of ["Sál A", "Salsa", "Ana Ruiz", p.festival.startDate]) expect(prompt).toContain(name);
    expect(aiPrompt(p, "en")).toMatch(/CSV/);
  });
});
