"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { type ActionResult, dbError, withFestival } from "@/lib/admin/guard";
import { type ImportRow, sameName } from "@/lib/import/format";
import { buildPlan, type ImportPlan, STYLE_PALETTE } from "@/lib/import/plan";
import { csCount } from "@/lib/plural";
import { loadProgram } from "@/lib/program";
import type { FestivalProgram } from "@/lib/types";

async function platformTeachers(db: SupabaseClient) {
  const { data } = await db.from("teacher_profiles").select("id, name").limit(5000);
  return data ?? [];
}

/** Náhled importu – nic se neukládá (PRD 5.4.1). */
export async function previewImport(slug: string, rows: ImportRow[]): Promise<ActionResult<ImportPlan>> {
  return withFestival<ImportPlan>(slug, async ({ db }) => {
    const program = await loadProgram(db, slug);
    if (!program) return { ok: false, error: "Festival nenalezen." };
    return { ok: true, data: buildPlan(program, rows, await platformTeachers(db)) };
  });
}

/**
 * Provede import. Plán se počítá znovu na serveru (klientovi se nevěří),
 * smaže jen položky, které organizátor v náhledu potvrdil.
 */
export async function applyImport(slug: string, rows: ImportRow[], deleteIds: string[]): Promise<ActionResult<string>> {
  return withFestival<string>(slug, async ({ db, festivalId, log }) => {
    let program = await loadProgram(db, slug);
    if (!program) return { ok: false, error: "Festival nenalezen." };
    const plan = buildPlan(program, rows, await platformTeachers(db));
    if (plan.errorCount) return { ok: false, error: `Import obsahuje chyby (${plan.errorCount}). Oprav je a nahraj soubor znovu.` };

    // 1) Nové místnosti, styly, učitelé a časové sloty
    if (plan.newRooms.length) {
      const { error } = await db
        .from("rooms")
        .insert(plan.newRooms.map((name, i) => ({ festival_id: festivalId, name, position: program!.rooms.length + i })));
      if (error) return { ok: false, error: dbError(error) };
    }
    if (plan.newStyles.length) {
      const { error } = await db
        .from("styles")
        .insert(plan.newStyles.map((name, i) => ({ festival_id: festivalId, name, color: STYLE_PALETTE[(program!.styles.length + i) % STYLE_PALETTE.length] })));
      if (error) return { ok: false, error: dbError(error) };
    }
    for (const name of plan.newTeachers) {
      const { error } = await db.rpc("create_teacher", { fid: festivalId, teacher_name: name });
      if (error) return { ok: false, error: dbError(error) };
    }
    if (plan.existingTeachers.length) {
      const { error } = await db
        .from("festival_teachers")
        .upsert(plan.existingTeachers.map((t) => ({ festival_id: festivalId, teacher_profile_id: t.id })));
      if (error) return { ok: false, error: dbError(error) };
    }
    if (plan.newSlots.length) {
      const dayByDate = new Map(program.days.map((d) => [d.date, d.id]));
      const { error } = await db
        .from("time_slots")
        .insert(plan.newSlots.map((s) => ({ festival_id: festivalId, day_id: dayByDate.get(s.date), starts_at: s.start, ends_at: s.end })));
      if (error) return { ok: false, error: dbError(error) };
    }
    program = (await loadProgram(db, slug))!;

    // 2) Smazání potvrzených položek
    const allowed = new Set(plan.deleteCandidates.map((c) => c.id));
    const toDelete = deleteIds.filter((id) => allowed.has(id));
    const lessonDeletes = toDelete.filter((id) => program!.lessons.some((l) => l.id === id));
    const partyDeletes = toDelete.filter((id) => program!.parties.some((x) => x.id === id));
    if (lessonDeletes.length) {
      const { error } = await db.from("lessons").delete().in("id", lessonDeletes);
      if (error) return { ok: false, error: dbError(error) };
    }
    if (partyDeletes.length) {
      const { error } = await db.from("parties").delete().in("id", partyDeletes);
      if (error) return { ok: false, error: dbError(error) };
    }

    // 3) Lekce a párty – při dočasné kolizi (lekce si vyměňují místa) se zkouší znovu
    // ID se použije jen u úprav, které plán ověřil jako položky tohoto festivalu.
    const work = plan.rows
      .filter((r) => r.action === "create" || r.action === "update")
      .map((r) => (r.action === "create" ? { ...r.row, id: null } : r.row));
    let pending = work;
    const failures: string[] = [];
    for (let pass = 0; pass < 4 && pending.length; pass++) {
      const next: ImportRow[] = [];
      failures.length = 0;
      for (const row of pending) {
        const error = row.kind === "lesson" ? await saveLessonRow(db, festivalId, program, row) : await savePartyRow(db, festivalId, program, row);
        if (error) {
          next.push(row);
          failures.push(`řádek ${row.line}: ${error}`);
        }
      }
      if (next.length === pending.length) break;
      pending = next;
    }

    const created = plan.rows.filter((r) => r.action === "create").length;
    const updated = plan.rows.filter((r) => r.action === "update").length;
    const summary = [
      `${csCount(created, ["nová položka", "nové položky", "nových položek"])}`,
      `${csCount(updated, ["úprava", "úpravy", "úprav"])}`,
      `${csCount(toDelete.length, ["smazaná", "smazané", "smazaných"])}`,
    ].join(", ");
    await log("program", "import", null, summary);

    if (failures.length) return { ok: false, error: `Import proběhl jen částečně. Neuložilo se: ${failures.join("; ")}` };
    return { ok: true, data: summary };
  });
}

function resolveSlots(program: FestivalProgram, dayId: string, start: string, end: string) {
  const slots = program.slots.filter((s) => s.dayId === dayId);
  const startSlot =
    slots.find((s) => s.startsAt === start && s.endsAt === end) ??
    slots.filter((s) => s.startsAt === start && s.endsAt <= end).sort((a, b) => a.endsAt.localeCompare(b.endsAt))[0];
  const endSlot =
    slots.find((s) => s.startsAt === start && s.endsAt === end) ??
    slots.filter((s) => s.endsAt === end && s.startsAt >= start).sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
  return { startSlot, endSlot };
}

async function saveLessonRow(db: SupabaseClient, festivalId: string, program: FestivalProgram, row: ImportRow): Promise<string | null> {
  const dayId = program.days.find((d) => d.date === row.date)?.id;
  if (!dayId) return "neznámý den";
  const { startSlot, endSlot } = resolveSlots(program, dayId, row.start, row.end);
  const room = program.rooms.find((r) => sameName(r.name, row.room));
  const style = row.style ? program.styles.find((s) => sameName(s.name, row.style)) : undefined;
  const teacherIds = row.teachers.map((n) => program.teachers.find((t) => sameName(t.name, n))?.id).filter((x): x is string => Boolean(x));
  if (!startSlot || !endSlot || !room) return "nenalezen slot nebo místnost";

  const payload = {
    festival_id: festivalId,
    day_id: dayId,
    start_slot_id: startSlot.id,
    end_slot_id: endSlot.id,
    room_id: room.id,
    style_id: style?.id ?? null,
    title_cs: row.titleCs || null,
    title_en: row.titleEn || null,
    description_cs: row.descriptionCs || null,
    description_en: row.descriptionEn || null,
    level: row.level,
  };
  const res = row.id
    ? await db.from("lessons").update(payload).eq("id", row.id).select("id").single()
    : await db.from("lessons").insert(payload).select("id").single();
  if (res.error) return dbError(res.error);
  const id = res.data.id as string;

  const { data: current } = await db.from("lesson_teachers").select("teacher_profile_id").eq("lesson_id", id);
  const before = new Set((current ?? []).map((r) => r.teacher_profile_id as string));
  const removed = [...before].filter((t) => !teacherIds.includes(t));
  const added = teacherIds.filter((t) => !before.has(t));
  if (removed.length) await db.from("lesson_teachers").delete().eq("lesson_id", id).in("teacher_profile_id", removed);
  if (added.length) {
    const { error } = await db.from("lesson_teachers").insert(added.map((t) => ({ lesson_id: id, teacher_profile_id: t })));
    if (error) return dbError(error);
  }
  return null;
}

async function savePartyRow(db: SupabaseClient, festivalId: string, program: FestivalProgram, row: ImportRow): Promise<string | null> {
  const dayId = program.days.find((d) => d.date === row.date)?.id;
  if (!dayId) return "neznámý den";
  const room = program.rooms.find((r) => sameName(r.name, row.room));
  const payload = {
    festival_id: festivalId,
    day_id: dayId,
    starts_at: row.start,
    ends_at: row.end || null,
    room_id: room?.id ?? null,
    place: room ? null : row.room,
    title_cs: row.titleCs || null,
    title_en: row.titleEn || null,
    description_cs: row.descriptionCs || null,
    description_en: row.descriptionEn || null,
  };
  const { error } = row.id ? await db.from("parties").update(payload).eq("id", row.id) : await db.from("parties").insert(payload);
  return error ? dbError(error) : null;
}

// ---------------------------------------------------------------------------
// Kopie z minulého ročníku (PRD 5.4.1)
// ---------------------------------------------------------------------------

/**
 * Zkopíruje místnosti, styly, učitele a časové sloty (podle pořadí dní), volitelně i lekce a párty,
 * z jiného festivalu, kde je uživatel organizátorem.
 */
export async function copyFromFestival(slug: string, sourceSlug: string, withProgram: boolean): Promise<ActionResult<string>> {
  return withFestival<string>(slug, async ({ db, festivalId, log }) => {
    const [target, source] = await Promise.all([loadProgram(db, slug), loadProgram(db, sourceSlug)]);
    if (!target || !source) return { ok: false, error: "Festival nenalezen." };
    const { data: canSource } = await db.rpc("is_organizer", { fid: source.festival.id });
    if (!canSource) return { ok: false, error: "Kopírovat lze jen z festivalu, kde jsi organizátor." };
    if (target.lessons.length || target.slots.length) {
      return { ok: false, error: "Kopírovat lze jen do festivalu bez časových slotů a lekcí. Nejdřív je smaž." };
    }

    // Místnosti a styly (stejné názvy se nezdvojují)
    const roomMap = new Map<string, string>();
    for (const r of [...source.rooms].sort((a, b) => a.position - b.position)) {
      const existing = target.rooms.find((x) => sameName(x.name, r.name));
      if (existing) {
        roomMap.set(r.id, existing.id);
        continue;
      }
      const { data, error } = await db.from("rooms").insert({ festival_id: festivalId, name: r.name, position: r.position }).select("id").single();
      if (error) return { ok: false, error: dbError(error) };
      roomMap.set(r.id, data.id);
    }
    const styleMap = new Map<string, string>();
    for (const s of source.styles) {
      const existing = target.styles.find((x) => sameName(x.name, s.name));
      if (existing) {
        styleMap.set(s.id, existing.id);
        continue;
      }
      const { data, error } = await db.from("styles").insert({ festival_id: festivalId, name: s.name, color: s.color }).select("id").single();
      if (error) return { ok: false, error: dbError(error) };
      styleMap.set(s.id, data.id);
    }

    // Učitelé – stejné profily (jsou globální)
    if (source.teachers.length) {
      const { error } = await db
        .from("festival_teachers")
        .upsert(source.teachers.map((t) => ({ festival_id: festivalId, teacher_profile_id: t.id })));
      if (error) return { ok: false, error: dbError(error) };
    }

    // Sloty podle pořadí dní (1. den → 1. den…)
    const slotMap = new Map<string, string>();
    const dayMap = new Map<string, string>();
    for (const [i, sourceDay] of source.days.entries()) {
      const targetDay = target.days[i];
      if (!targetDay) break;
      dayMap.set(sourceDay.id, targetDay.id);
      for (const s of source.slots.filter((x) => x.dayId === sourceDay.id)) {
        const { data, error } = await db
          .from("time_slots")
          .insert({ festival_id: festivalId, day_id: targetDay.id, starts_at: s.startsAt, ends_at: s.endsAt })
          .select("id")
          .single();
        if (error) return { ok: false, error: dbError(error) };
        slotMap.set(s.id, data.id);
      }
    }

    let lessonCount = 0;
    if (withProgram) {
      for (const l of source.lessons) {
        const dayId = dayMap.get(l.dayId);
        if (!dayId) continue;
        const { data, error } = await db
          .from("lessons")
          .insert({
            festival_id: festivalId,
            day_id: dayId,
            start_slot_id: slotMap.get(l.startSlotId),
            end_slot_id: slotMap.get(l.endSlotId),
            room_id: roomMap.get(l.roomId),
            style_id: l.styleId ? styleMap.get(l.styleId) : null,
            title_cs: l.titleCs,
            title_en: l.titleEn,
            description_cs: l.descriptionCs,
            description_en: l.descriptionEn,
            level: l.level,
          })
          .select("id")
          .single();
        if (error) return { ok: false, error: dbError(error) };
        if (l.teacherIds.length) {
          await db.from("lesson_teachers").insert(l.teacherIds.map((t) => ({ lesson_id: data.id, teacher_profile_id: t })));
        }
        lessonCount++;
      }
      for (const x of source.parties) {
        const dayId = dayMap.get(x.dayId);
        if (!dayId) continue;
        await db.from("parties").insert({
          festival_id: festivalId,
          day_id: dayId,
          starts_at: x.startsAt,
          ends_at: x.endsAt,
          room_id: x.roomId ? roomMap.get(x.roomId) : null,
          place: x.place,
          title_cs: x.titleCs,
          title_en: x.titleEn,
          description_cs: x.descriptionCs,
          description_en: x.descriptionEn,
        });
      }
    }

    const summary = `z ${source.festival.name}: ${csCount(source.rooms.length, ["místnost", "místnosti", "místností"])}, ${csCount(
      source.teachers.length,
      ["učitel", "učitelé", "učitelů"],
    )}, ${csCount(slotMap.size, ["slot", "sloty", "slotů"])}${withProgram ? `, ${csCount(lessonCount, ["lekce", "lekce", "lekcí"])}` : ""}`;
    await log("program", "import", null, `kopie ${summary}`);
    return { ok: true, data: summary };
  });
}
