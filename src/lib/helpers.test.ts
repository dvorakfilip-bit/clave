import { describe, expect, it } from "vitest";
import { datesBetween, generateSlotTimes } from "./admin/slots";
import { csCount } from "./plural";
import { shortName } from "./short-name";

describe("generateSlotTimes – generátor časových slotů (PRD 5.4)", () => {
  it("hodinové lekce s pauzou", () => {
    expect(generateSlotTimes("11:30", 60, 10, 3)).toEqual([
      { startsAt: "11:30", endsAt: "12:30" },
      { startsAt: "12:40", endsAt: "13:40" },
      { startsAt: "13:50", endsAt: "14:50" },
    ]);
  });

  it("45minutové lekce bez pauzy", () => {
    expect(generateSlotTimes("10:00", 45, 0, 2)).toEqual([
      { startsAt: "10:00", endsAt: "10:45" },
      { startsAt: "10:45", endsAt: "11:30" },
    ]);
  });

  it("nepřeleze půlnoc", () => {
    expect(generateSlotTimes("22:00", 60, 0, 5)).toHaveLength(1);
  });
});

describe("datesBetween – dny festivalu", () => {
  it("včetně prvního a posledního dne, přes konec měsíce", () => {
    expect(datesBetween("2027-06-29", "2027-07-02")).toEqual(["2027-06-29", "2027-06-30", "2027-07-01", "2027-07-02"]);
  });

  it("jednodenní festival", () => {
    expect(datesBetween("2027-07-06", "2027-07-06")).toEqual(["2027-07-06"]);
  });
});

describe("csCount – české skloňování", () => {
  const forms: [string, string, string] = ["lekce", "lekce", "lekcí"];
  it.each([
    [0, "0 lekcí"],
    [1, "1 lekce"],
    [3, "3 lekce"],
    [5, "5 lekcí"],
    [22, "22 lekcí"],
  ])("%i → %s", (n, expected) => {
    expect(csCount(n, forms)).toBe(expected);
  });
});

describe("shortName – název pod ikonou (max. 15 znaků)", () => {
  it("použije zadaný krátký název", () => {
    expect(shortName({ name: "Czech Salsa Spring Festival", shortName: "CSSF 2027" })).toBe("CSSF 2027");
  });

  it("krátký název festivalu použije celý", () => {
    expect(shortName({ name: "CSSF 2027", shortName: null })).toBe("CSSF 2027");
  });

  it("dlouhý název zkrátí po slovech", () => {
    expect(shortName({ name: "Demo Salsa Festival 2027", shortName: null })).toBe("Demo Salsa");
    expect(shortName({ name: "Czech Salsa Spring Festival", shortName: null }).length).toBeLessThanOrEqual(15);
  });
});
