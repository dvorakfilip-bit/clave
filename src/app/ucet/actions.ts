"use server";

import { updateTag } from "next/cache";
import { type ActionResult, dbError } from "@/lib/admin/guard";
import { festivalTag } from "@/lib/program";
import { m } from "@/lib/server-locale";
import { createServerSupabase } from "@/lib/supabase/server";

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** Po změně globálního medailonku obnoví cache všech festivalů, kde učitel učí. */
async function refreshFestivals(db: Awaited<ReturnType<typeof createServerSupabase>>, profileId: string) {
  const { data } = await db.from("festival_teachers").select("festivals(slug)").eq("teacher_profile_id", profileId);
  for (const row of data ?? []) {
    const slug = (row.festivals as unknown as { slug: string } | null)?.slug;
    if (slug) updateTag(festivalTag(slug));
  }
}

/** Učitel si upravuje svůj globální medailonek (PRD 5.5). */
export async function updateMyTeacherProfile(input: { name: string; bioCs: string; bioEn: string; photoUrl: string }): Promise<ActionResult> {
  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: await m("Nejsi přihlášený.", "You're not signed in.") };
  if (!input.name.trim()) return { ok: false, error: await m("Vyplň jméno.", "Enter your name.") };
  if (clean(input.photoUrl) && !input.photoUrl.trim().startsWith("https://")) {
    return { ok: false, error: await m("Odkaz na fotku musí začínat https://.", "The photo link must start with https://.") };
  }

  const { data, error } = await db
    .from("teacher_profiles")
    .update({ name: input.name.trim(), bio_cs: clean(input.bioCs), bio_en: clean(input.bioEn), photo_url: clean(input.photoUrl) })
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: await dbError(error) };
  await refreshFestivals(db, data.id);
  return { ok: true };
}

/** Vrátí medailonek do stavu před vybranou změnou (vznikne tím nová položka historie). */
export async function revertMyTeacherProfile(revisionId: number): Promise<ActionResult> {
  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: await m("Nejsi přihlášený.", "You're not signed in.") };

  const { data: revisions } = await db.rpc("my_teacher_revisions");
  const revision = (revisions as { id: number; previous: Record<string, string | null> }[] | null)?.find((r) => r.id === revisionId);
  if (!revision) return { ok: false, error: await m("Verze nenalezena.", "Version not found.") };

  const p = revision.previous;
  const { data, error } = await db
    .from("teacher_profiles")
    .update({ name: p.name ?? undefined, bio_cs: p.bio_cs, bio_en: p.bio_en, photo_url: p.photo_url })
    .eq("user_id", user.id)
    .select("id")
    .single();
  if (error) return { ok: false, error: await dbError(error) };
  await refreshFestivals(db, data.id);
  return { ok: true };
}
