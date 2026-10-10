"use client";

import { useState } from "react";
import { updateBranding } from "@/app/admin/actions";
import { HeartIcon, MoonIcon } from "@/components/icons";
import { LevelDots } from "@/components/LevelDots";
import { DARK_SURFACE, mix } from "@/lib/color";
import { FONTS, fontFamily } from "@/lib/font-list";
import { useI18n } from "@/lib/i18n";
import { paletteWarnings } from "@/lib/palette-check";
import { festivalPalette } from "@/lib/theme";
import type { FestivalProgram } from "@/lib/types";
import { ColorPicker } from "./ColorPicker";
import { ImageUpload } from "./ImageUpload";
import { Button, Card, ErrorText, Field, useAction } from "./ui";

const ROLES = [
  { name: { cs: "Hlavní", en: "Primary" }, hint: { cs: "Hlavička, vybraný den, tlačítka", en: "Header, selected day, buttons" } },
  { name: { cs: "Doplňková", en: "Secondary" }, hint: { cs: "Akcenty, podbarvení párty", en: "Accents, party background" } },
  { name: { cs: "Zvýrazňující", en: "Highlight" }, hint: { cs: "Štítek Změna, srdíčko, teď probíhá", en: "Changed label, heart, happening now" } },
  { name: { cs: "Podklad", en: "Background" }, hint: { cs: "Pozadí stránky", en: "Page background" } },
  { name: { cs: "Text", en: "Text" }, hint: { cs: "Barva písma", en: "Font color" } },
];

/** Vizuální identita festivalu s živým náhledem (PRD 7.2, 7.3). */
export function BrandingEditor({ program, isLead }: { program: FestivalProgram; isLead: boolean }) {
  const f = program.festival;
  const { run, pending, error } = useAction();
  const { locale, tr } = useI18n();
  const [saved, setSaved] = useState(false);
  const [colors, setColors] = useState<string[]>(f.colors);
  const [font, setFont] = useState(f.font);
  const [logoWide, setLogoWide] = useState(f.logoWideUrl ?? "");
  const [logoSquare, setLogoSquare] = useState(f.logoSquareUrl ?? "");
  const [banner, setBanner] = useState(f.bannerUrl ?? "");
  const [dark, setDark] = useState(false);
  const [uploading, setUploading] = useState(0);
  const trackUpload = (busy: boolean) => setUploading((n) => n + (busy ? 1 : -1));
  const folder = `festivals/${f.id}`;
  const warnings = paletteWarnings(colors, locale);
  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setSaved(false);
    setter(v);
  };

  function setColor(i: number, value: string) {
    setSaved(false);
    setColors(colors.map((c, j) => (j === i ? value : c)));
  }

  if (!isLead) {
    return (
      <Card>
        <p className="text-sm text-muted">{tr("Vzhled festivalu nastavuje hlavní organizátor.", "Only the lead organizer can change the festival appearance.")}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Card title={tr("Logo a banner", "Logo and banner")}>
          <div className="space-y-4">
            <Field label={tr("Široké logo", "Wide logo")} hint={tr("Hlavička a úvod festivalu. Ideálně na průhledném pozadí.", "Header and festival intro. Ideally on a transparent background.")}>
              <ImageUpload value={logoWide} onChange={touch(setLogoWide)} onBusyChange={trackUpload} folder={folder} maxSize={800} shape="wide" />
            </Field>
            <Field label={tr("Čtvercové logo", "Square logo")} hint={tr("Ikona na ploše telefonu a v seznamu festivalů.", "Icon on the phone's home screen and in the festival list.")}>
              <ImageUpload value={logoSquare} onChange={touch(setLogoSquare)} onBusyChange={trackUpload} folder={folder} maxSize={512} />
            </Field>
            <Field label="Banner" hint={tr("Úvodní fotka nebo grafika festivalu (na šířku).", "Main festival photo or graphic (landscape).")}>
              <ImageUpload value={banner} onChange={touch(setBanner)} onBusyChange={trackUpload} folder={folder} maxSize={1600} shape="wide" />
            </Field>
          </div>
        </Card>

        <Card title={tr("Barvy", "Colors")}>
          <p className="mb-3 text-xs text-muted">
            {tr(
              "Zadej 1–5 barev. Chybějící se dopočítají z hlavní barvy. Barvu textu na barevných plochách volí aplikace sama.",
              "Enter 1–5 colors. Missing ones are derived from the primary color. Text color on colored areas is chosen automatically.",
            )}
          </p>
          <ul className="space-y-2">
            {colors.map((c, i) => {
              const warning = warnings.find((w) => w.index === i);
              return (
                <li key={i}>
                  <div className="flex items-center gap-2">
                    <ColorPicker value={c} onChange={(hex) => setColor(i, hex)} label={tr(ROLES[i].name.cs, ROLES[i].name.en)} />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium">{tr(ROLES[i].name.cs, ROLES[i].name.en)}</span>
                      <span className="block truncate text-xs text-muted">{tr(ROLES[i].hint.cs, ROLES[i].hint.en)}</span>
                    </span>
                    <span className="w-16 shrink-0 text-right">
                      {i > 0 && i === colors.length - 1 && (
                        <Button variant="ghost" type="button" className="!px-1" onClick={() => touch(setColors)(colors.slice(0, -1))}>
                          {tr("Odebrat", "Remove")}
                        </Button>
                      )}
                    </span>
                  </div>
                  {warning && (
                    <p className="mt-1 text-xs text-highlight">
                      {warning.message}{" "}
                      <button type="button" className="underline" onClick={() => setColor(i, warning.suggestion)}>
                        {tr("Použít", "Use")} {warning.suggestion}
                      </button>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {colors.length < 5 && (
            <Button className="mt-3" type="button" onClick={() => touch(setColors)([...colors, colors.length === 3 ? "#FFFFFF" : colors.length === 4 ? "#1B1B1B" : colors[0]])}>
              {tr("Přidat barvu", "Add color")}: {tr(ROLES[colors.length].name.cs, ROLES[colors.length].name.en).toLowerCase()}
            </Button>
          )}
          {warnings.filter((w) => w.index >= colors.length).map((w) => (
            <p key={w.message} className="mt-2 text-xs text-highlight">
              {w.message}
            </p>
          ))}
        </Card>

        <Card title={tr("Písmo", "Font")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(FONTS).map(([key, def]) => (
              <button
                type="button"
                key={key}
                onClick={() => touch(setFont)(key)}
                aria-pressed={font === key}
                className={`rounded-lg border px-3 py-2 text-left ${font === key ? "border-brand ring-1 ring-brand" : "border-line"}`}
                style={{ fontFamily: fontFamily(key) }}
              >
                <span className="block font-semibold">{def.label}</span>
                <span className="text-sm text-muted">{tr("Příliš žluťoučký kůň", "The quick brown fox")}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            disabled={pending || uploading > 0}
            onClick={() =>
              run(
                () => updateBranding(f.slug, { colors, font, logoWideUrl: logoWide, logoSquareUrl: logoSquare, bannerUrl: banner }),
                () => setSaved(true),
              )
            }
          >
            {tr("Uložit vzhled", "Save appearance")}
          </Button>
          {saved && <span className="text-sm text-muted">{tr("Uloženo – na webu se projeví do minuty.", "Saved – changes appear on the site within a minute.")}</span>}
        </div>
        <ErrorText error={error} />
      </div>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">{tr("Náhled", "Preview")}</span>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
            {tr("Tmavý režim", "Dark mode")}
          </label>
        </div>
        <Preview program={program} colors={colors} font={font} logoWide={logoWide} logoSquare={logoSquare} banner={banner} dark={dark} />
      </div>
    </div>
  );
}

function Preview({
  program,
  colors,
  font,
  logoWide,
  logoSquare,
  banner,
  dark,
}: {
  program: FestivalProgram;
  colors: string[];
  font: string;
  logoWide: string;
  logoSquare: string;
  banner: string;
  dark: boolean;
}) {
  const { locale, t, tr } = useI18n();
  const valid = colors.filter((c) => /^#[0-9A-Fa-f]{6}$/.test(c));
  const vars = festivalPalette(valid.length ? valid : ["#C8102E"])[dark ? "dark" : "light"] as Record<string, string>;
  const f = program.festival;
  const styles = program.styles.length ? program.styles.slice(0, 2) : [{ id: "a", name: "Salsa", color: "#E45756" }, { id: "b", name: "Bachata", color: "#3E9C4A" }];
  const card = (color: string) =>
    dark
      ? { background: mix(color, DARK_SURFACE, 0.72), color: mix(color, "#ffffff", 0.7) }
      : { background: mix(color, "#ffffff", 0.84), color: mix(color, "#000000", 0.45) };

  return (
    <div
      className="mx-auto w-[320px] overflow-hidden rounded-[28px] border-[6px] border-neutral-800 text-[12px]"
      style={{ ...vars, background: "var(--page)", color: "var(--ink)", fontFamily: fontFamily(font) } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3 py-3" style={{ background: "var(--brand)", color: "var(--on-brand)" }}>
        {logoWide ? (
          // eslint-disable-next-line @next/next/no-img-element -- náhled
          <img src={logoWide} alt="" className="h-8 max-w-[160px] object-contain" />
        ) : logoSquare ? (
          // eslint-disable-next-line @next/next/no-img-element -- náhled
          <img src={logoSquare} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: "var(--on-brand)", color: "var(--brand)" }}>
            {f.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        {!logoWide && <span className="truncate text-[13px] font-semibold">{f.name}</span>}
      </div>
      <div className="flex gap-1.5 px-2 py-2" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
        {(locale === "cs" ? ["Út 6.", "St 7.", "Čt 8."] : ["Tue 6", "Wed 7", "Thu 8"]).map((d, i) => (
          <span
            key={d}
            className="rounded-full px-2.5 py-1 text-[11px]"
            style={i === 0 ? { background: "var(--brand)", color: "var(--on-brand)" } : { border: "1px solid var(--line)", color: "var(--muted)" }}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        {styles.map((s, i) => (
          <div key={s.id} className="relative rounded-lg p-2" style={card(s.color)}>
            {i === 0 && (
              <span className="absolute right-1 top-1 rounded px-1 text-[9px] font-semibold uppercase" style={{ background: "var(--highlight)", color: "var(--on-highlight)" }}>
                {t("changed")}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px]">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
            <p className="mt-1 font-semibold">{i === 0 ? "Shines a styling" : "Footwork"}</p>
            <p className="text-[11px]">Ana Ruiz</p>
            <span className="mt-1 flex items-center justify-between">
              <LevelDots level={i === 0 ? 1.5 : 0.5} />
              <span style={{ color: i === 0 ? "var(--highlight)" : undefined, opacity: i === 0 ? 1 : 0.6 }}>
                <HeartIcon filled={i === 0} size={14} />
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mx-2 mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "var(--accent-soft)" }}>
        <span style={{ color: "var(--accent)" }}>
          <MoonIcon />
        </span>
        22:00 {tr("Uvítací párty", "Welcome party")}
      </div>
      {banner && (
        // eslint-disable-next-line @next/next/no-img-element -- náhled
        <img src={banner} alt="" className="mx-2 mb-2 h-20 w-[calc(100%-16px)] rounded-lg object-cover" />
      )}
      <div className="grid grid-cols-4 py-2 text-center text-[10px]" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", color: "var(--muted)" }}>
        <span style={{ color: dark ? "var(--accent)" : "var(--brand)" }}>{t("program")}</span>
        <span>{t("myProgram")}</span>
        <span>{t("teachers")}</span>
        <span>{t("more")}</span>
      </div>
    </div>
  );
}
