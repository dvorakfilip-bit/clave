import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "images";

/** Cesta souboru v úložišti z veřejné adresy; cizí adresy vrací null. */
export function storagePath(url: string | null | undefined): string | null {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  return url && url.startsWith(base) ? decodeURIComponent(url.slice(base.length)) : null;
}

/**
 * Smaže obrázky, které už nic nepoužívá (nahrazené logo, fotka…). Chyba se ignoruje –
 * zbytečný soubor v úložišti nevadí víc než nepovedená úprava.
 */
export async function removeImages(db: SupabaseClient, urls: (string | null | undefined)[], keep: (string | null | undefined)[] = []) {
  const kept = new Set(keep.filter(Boolean));
  const paths = [...new Set(urls.filter((u) => u && !kept.has(u)).map(storagePath))].filter((p): p is string => Boolean(p));
  if (paths.length) await db.storage.from(BUCKET).remove(paths);
}
