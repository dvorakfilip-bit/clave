import { describe, expect, it } from "vitest";
import { contrast, mix, textOn } from "./color";
import { adjustToContrast, paletteWarnings } from "./palette-check";
import { festivalPalette, festivalThemeCss } from "./theme";

describe("barvy", () => {
  it("kontrast černé a bílé je 21 : 1", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("mix míchá barvy", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#C8102E", "#ffffff", 0)).toBe("#c8102e");
  });

  it("text na barevné ploše volí čitelnější barvu", () => {
    expect(textOn("#C8102E")).toBe("#ffffff");
    expect(textOn("#FFE14D")).toBe("#1b1b1b");
  });
});

describe("festivalPalette – dopočítání chybějících barev (PRD 7.2)", () => {
  it("z jedné barvy dopočítá ostatní role", () => {
    const { light, dark } = festivalPalette(["#0E6E8C"]);
    expect(light["--brand"]).toBe("#0E6E8C");
    expect(light["--highlight"]).toBe("#0E6E8C");
    expect(light["--page"]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(dark["--surface"]).not.toBe(light["--surface"]);
  });

  it("text na hlavní barvě je vždy čitelný", () => {
    for (const color of ["#C8102E", "#FFE14D", "#0E6E8C", "#F5F5F5", "#1B1B1B"]) {
      const { light } = festivalPalette([color]);
      expect(contrast(light["--on-brand"], light["--brand"])).toBeGreaterThanOrEqual(3);
    }
  });

  it("CSS obsahuje světlý i tmavý režim", () => {
    const css = festivalThemeCss(["#C8102E"], ".festival");
    expect(css).toContain(".festival{--brand:#C8102E;");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });
});

describe("paletteWarnings – kontrola čitelnosti (PRD 7.3)", () => {
  it("dobrá paleta je bez varování", () => {
    expect(paletteWarnings(["#0E6E8C", "#F2A541", "#E4572E", "#FFF8EE"], "cs")).toEqual([]);
    expect(paletteWarnings(["#C8102E"], "cs")).toEqual([]);
  });

  it("světle žlutá hlavní barva na světlém pozadí dostane varování s čitelným návrhem", () => {
    const warnings = paletteWarnings(["#FFE14D"], "cs");
    expect(warnings).toHaveLength(1);
    const { light } = festivalPalette(["#FFE14D"]);
    expect(contrast(warnings[0].suggestion, light["--page"])).toBeGreaterThanOrEqual(3);
  });

  it("šedý text na světlém pozadí dostane varování", () => {
    const warnings = paletteWarnings(["#0E6E8C", "#F2A541", "#E4572E", "#FFF8EE", "#BBBBBB"], "en");
    expect(warnings.some((w) => w.index === 4)).toBe(true);
    expect(warnings.every((w) => !/[ěščřžýáíé]/.test(w.message))).toBe(true);
  });

  it("adjustToContrast dosáhne požadovaného kontrastu", () => {
    for (const [color, against, ratio] of [
      ["#FFE14D", "#FFFFFF", 4.5],
      ["#333333", "#121215", 4.5],
      ["#E4572E", "#FFF8EE", 3],
    ] as const) {
      expect(contrast(adjustToContrast(color, against, ratio), against)).toBeGreaterThanOrEqual(ratio);
    }
  });
});
