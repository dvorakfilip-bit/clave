import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { FESTIVALS_TAG, festivalTag } from "@/lib/program";
import { m } from "@/lib/server-locale";
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

/** Známé hlášky z databázových triggerů a funkcí (česky) → anglicky. */
const DB_MESSAGES_EN: Record<string, string> = {
  "V této místnosti a čase už je jiná lekce": "Another class is already in this room at this time",
  "Festival musí mít alespoň jednoho hlavního organizátora": "The festival must have at least one lead organizer",
  "Adresu a stav festivalu mění jen hlavní organizátor": "Only the lead organizer can change the festival address and status",
  "Vzhled festivalu mění jen hlavní organizátor": "Only the lead organizer can change the festival appearance",
  "Neplatný rozsah slotů lekce": "Invalid time slot range for the class",
  "Tento účet už má profil učitele": "This account already has a teacher profile",
  "Profil učitele už je propojený s jiným účtem": "The teacher profile is already linked to another account",
  "Nedostatečná oprávnění": "Insufficient permissions",
  "Jsi jediný hlavní organizátor festivalu. Nejdřív předej roli někomu jinému.":
    "You're the only lead organizer of this festival. Hand the role over to someone else first.",
};

/** Srozumitelné chybové hlášky z Postgresu. */
export async function dbError(e: PostgrestError | null): Promise<string> {
  if (!e) return m("Neznámá chyba", "Unknown error");
  if (e.code === "23503") {
    return m(
      "Položku nelze smazat, protože se používá (např. v lekcích).",
      "This item can't be deleted because it's in use (e.g. in lessons).",
    );
  }
  if (e.code === "23505") return m("Taková položka už existuje.", "This item already exists.");
  if (e.code === "42501") return m("Na tuto akci nemáš oprávnění.", "You don't have permission for this action.");
  const en = DB_MESSAGES_EN[e.message];
  return en ? m(e.message, en) : e.message;
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
  if (!user) return { ok: false, error: await m("Nejsi přihlášený.", "You're not signed in.") };

  const { data: festival } = await db.from("festivals").select("id").eq("slug", slug).maybeSingle();
  if (!festival) return { ok: false, error: await m("Festival nenalezen.", "Festival not found.") };
  const { data: allowed } = await db.rpc("is_organizer", { fid: festival.id });
  if (!allowed) return { ok: false, error: await m("Na tento festival nemáš oprávnění.", "You don't have permission for this festival.") };

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
