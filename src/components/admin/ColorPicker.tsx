"use client";

import { useEffect, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { useI18n } from "@/lib/i18n";

const SWATCHES = ["#C8102E", "#E45756", "#E08A1E", "#F2A541", "#3E9C4A", "#1E9E9A", "#0E6E8C", "#3F72AF", "#5B1E86", "#C2185B", "#1B1B1B", "#FFFFFF"];

/** Výběr barvy: po kliknutí se rozbalí spektrum, rychlé barvy a kód barvy. */
export function ColorPicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label: string }) {
  const { tr } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";

  // Zavřít kliknutím mimo nebo klávesou Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`${label} – ${tr("vybrat barvu", "choose color")}`}
        aria-expanded={open}
        className="h-10 w-12 rounded-lg border border-line p-1"
      >
        <span className="block h-full w-full rounded-md" style={{ background: valid }} />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-40 w-[232px] space-y-3 rounded-xl border border-line bg-surface p-3 shadow-lg">
          <HexColorPicker color={valid} onChange={(c) => onChange(c.toUpperCase())} style={{ width: "100%", height: 160 }} />
          <div className="grid grid-cols-6 gap-1.5">
            {SWATCHES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => onChange(s)}
                aria-label={s}
                className={`h-7 rounded-md border ${s.toUpperCase() === valid.toUpperCase() ? "border-ink ring-1 ring-ink" : "border-line"}`}
                style={{ background: s }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            {tr("Kód", "Code")}
            <HexColorInput
              color={valid}
              // Jen celý kód #RRGGBB – zkrácený tvar by přepsal pole uprostřed psaní.
              onChange={(c) => c.length === 7 && onChange(c.toUpperCase())}
              prefixed
              className="w-full rounded-lg border border-line bg-page px-2 py-1.5 font-mono text-sm text-ink"
            />
          </label>
          <button type="button" onClick={() => setOpen(false)} className="w-full rounded-lg bg-brand py-1.5 text-xs font-semibold text-on-brand">
            {tr("Hotovo", "Done")}
          </button>
        </div>
      )}
    </div>
  );
}
