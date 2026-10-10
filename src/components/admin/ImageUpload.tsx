"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { uploadImage } from "@/lib/images";

/** Nahrání obrázku s náhledem; vrací veřejnou URL přes `onChange`. */
export function ImageUpload({
  value,
  onChange,
  folder,
  maxSize,
  shape = "square",
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  maxSize: number;
  shape?: "square" | "wide" | "round";
  label?: string;
}) {
  const { tr, locale } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = { square: "h-20 w-20 rounded-xl", wide: "h-16 w-48 rounded-xl", round: "h-20 w-20 rounded-full" }[shape];

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(
        tr(
          "Tento formát nejde nahrát. Použij JPG, PNG nebo WebP (fotku z iPhonu ulož jako JPG).",
          "This format can't be uploaded. Use JPG, PNG or WebP (save iPhone photos as JPG).",
        ),
      );
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError(tr("Obrázek je větší než 15 MB.", "The image is larger than 15 MB."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file, folder, maxSize, locale));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Nahrání se nepovedlo.", "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className={`${box} flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-line bg-page`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- obrázek z úložiště */}
        {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted">{tr("bez obrázku", "no image")}</span>}
      </div>
      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-brand disabled:opacity-50"
          >
            {busy ? tr("Nahrávám…", "Uploading…") : (label ?? tr("Nahrát obrázek", "Upload image"))}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="rounded-lg border border-line px-3 py-1.5 text-xs">
              {tr("Odebrat", "Remove")}
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted">{tr("JPG, PNG nebo WebP, max. 15 MB. Obrázek se automaticky zmenší.", "JPG, PNG or WebP, max. 15 MB. The image is resized automatically.")}</p>
        {error && <p className="text-xs text-highlight">{error}</p>}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
