"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";

const BUCKET = "images";

/** Zmenší obrázek v prohlížeči (delší strana max `maxSize` px) a převede ho na WebP (PRD 6.4). */
async function resize(file: File, maxSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("Obrázek se nepodařilo zpracovat.");
  return blob;
}

/**
 * Nahraje obrázek do úložiště a vrátí jeho veřejnou adresu.
 * `folder` určuje oprávnění (viz migrace 0006), např. `festivals/<id>`.
 */
export async function uploadImage(file: File, folder: string, maxSize: number): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Vyber obrázek (JPG, PNG nebo WebP).");
  const blob = await resize(file, maxSize);
  if (blob.size > 2 * 1024 * 1024) throw new Error("Obrázek je i po zmenšení příliš velký.");

  const db = createBrowserSupabase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await db.storage.from(BUCKET).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(error.message.includes("row-level security") ? "Na nahrání tohoto obrázku nemáš oprávnění." : error.message);
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
