import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { FESTIVALS_TAG, festivalTag } from "@/lib/program";
import { createServerSupabase } from "@/lib/supabase/server";

export type ActionResult<T = undefined> = { ok: true; data?: T; warning?: string } | { ok: false; error: string };

export interface FestivalCtx {
  db: SupabaseClient;
  festivalId: string;
  slug: string;
  userId: string;
  /** Zápis do logu změn (PRD 5.4 – kdo, kdy, co). */
  log: (entity: string, action: "create" | "update" | "delete" | "cancel" | "restore" | "import", entityId: string | null, label: string) => Promise<void>;
}

/** Srozumitelné chybové hlášky z Postgresu. */
export function dbError(e: PostgrestError | null): string {
  if (!e) return "Neznámá chyba";
  if (e.code === "23503") return "Položku nelze smazat, protože se používá (např. v lekcích).";
  if (e.code === "23505") return "Taková položka už existuje.";
  if (e.code === "42501") return "Na tuto akci nemáš oprávnění.";
  return e.message;
}

/**
 * Spustí akci nad festivalem jako přihlášený organizátor. Oprávnění hlídá RLS v databázi;
 * po úspěchu se obnoví cache veřejného programu.
 */
export async function withFestival<T>(
  slug: string,
  fn: (ctx: FestivalCtx) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Nejsi přihlášený." };

  const { data: festival } = await db.from("festivals").select("id").eq("slug", slug).maybeSingle();
  if (!festival) return { ok: false, error: "Festival nenalezen." };
  const { data: allowed } = await db.rpc("is_organizer", { fid: festival.id });
  if (!allowed) return { ok: false, error: "Na tento festival nemáš oprávnění." };

  const ctx: FestivalCtx = {
    db,
    festivalId: festival.id,
    slug,
    userId: user.id,
    log: async (entity, action, entityId, label) => {
      await db.from("change_log").insert({
        festival_id: festival.id,
        actor_id: user.id,
        entity,
        entity_id: entityId,
        action,
        data: { label },
      });
    },
  };

  const result = await fn(ctx);
  if (result.ok) {
    updateTag(festivalTag(slug));
    updateTag(FESTIVALS_TAG);
  }
  return result;
}
