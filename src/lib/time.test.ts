import { describe, expect, it } from "vitest";
import { crossesMidnight, formatDay, formatRange, nowInZone, overlaps, span } from "./time";

describe("nowInZone – čas v pásmu festivalu", () => {
  it("převede okamžik do pásma festivalu, ne podle telefonu", () => {
    const instant = new Date("2027-07-06T21:30:00Z");
    expect(nowInZone("Europe/Zagreb", instant)).toEqual({ date: "2027-07-06", time: "23:30" });
    expect(nowInZone("Europe/London", instant)).toEqual({ date: "2027-07-06", time: "22:30" });
  });

  it("přes půlnoc už je další den", () => {
    expect(nowInZone("Europe/Prague", new Date("2027-07-06T22:15:00Z"))).toEqual({ date: "2027-07-07", time: "00:15" });
  });

  it("počítá se zimním časem", () => {
    expect(nowInZone("Europe/Prague", new Date("2027-01-10T09:00:00Z")).time).toBe("10:00");
  });
});

describe("span a overlaps – kolize lekcí a párty", () => {
  it("lekce se stejným časem se překrývají", () => {
    expect(overlaps(span("11:30", "12:30"), span("11:30", "12:30"))).toBe(true);
  });

  it("navazující lekce se nepřekrývají", () => {
    expect(overlaps(span("11:30", "12:30"), span("12:30", "13:30"))).toBe(false);
  });

  it("workshop přes dva sloty koliduje s lekcí uvnitř", () => {
    expect(overlaps(span("12:40", "14:50"), span("13:50", "14:50"))).toBe(true);
  });

  it("párty přes půlnoc trvá do rána", () => {
    expect(span("22:00", "04:00")).toEqual([22 * 60, 28 * 60]);
    expect(overlaps(span("22:00", "04:00"), span("23:30", "23:59"))).toBe(true);
    expect(overlaps(span("22:00", "04:00"), span("20:00", "21:00"))).toBe(false);
  });

  it("párty bez konce se počítá jako hodina", () => {
    expect(span("22:00", null)).toEqual([22 * 60, 23 * 60]);
  });
});

describe("crossesMidnight", () => {
  it("pozná konec po půlnoci", () => {
    expect(crossesMidnight("22:00", "04:00")).toBe(true);
    expect(crossesMidnight("20:00", "23:00")).toBe(false);
    expect(crossesMidnight("20:00", null)).toBe(false);
  });
});

describe("formátování data", () => {
  it("den se neposune kvůli časovému pásmu", () => {
    expect(formatDay("2027-07-06", "cs")).toBe("út 6. 7.");
    expect(formatDay("2027-07-06", "en")).toMatch(/Tue/);
  });

  it("rozsah festivalu", () => {
    expect(formatRange("2027-07-06", "2027-07-08", "cs")).toBe("6. 7. – 8. 7. 2027");
    expect(formatRange("2027-07-06", "2027-07-06", "cs")).toBe("6. 7. 2027");
  });
});
