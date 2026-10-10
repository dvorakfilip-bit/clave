"use server";

import { updateTag } from "next/cache";
import { type ActionResult, dbError, withFestival } from "@/lib/admin/guard";
import { datesBetween, generateSlotTimes, RESERVED_SLUGS } from "@/lib/admin/slots";
import { removeImages } from "@/lib/admin/storage";
import { FESTIVALS_TAG, festivalTag } from "@/lib/program";
import { csCount } from "@/lib/plural";
import { m } from "@/lib/server-locale";
import { createServerSupabase } from "@/lib/supabase/server";

const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
const EMAIL = /^\S+@\S+\.\S+$/;
/** Pozice na konec seznamu (po smazání může být v číslování mezera). */
const nextPosition = (rows: { position: number }[] | null) => Math.max(-1, ...(rows ?? []).map((r) => r.position)) + 1;

type Db = Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Kontrola nových časových slotů dne: stejný slot podruhé se nepřidá, překryv s jiným
 * slotem se jen hlásí (vícehodinové workshopy ho můžou potřebovat).
 */
async function checkSlots(db: Db, dayId: string, times: { startsAt: string; endsAt: string }[], exceptId?: string) {
  const { data } = await db.from("time_slots").select("id, starts_at, ends_at").eq("day_id", dayId);
  const existing = (data ?? []).filter((s) => s.id !== exceptId).map((s) => ({ startsAt: s.starts_at.slice(0, 5), endsAt: s.ends_at.slice(0, 5) }));
  const fresh = times.filter((t) => !existing.some((e) => e.startsAt === t.startsAt && e.endsAt === t.endsAt));
  const overlapping = existing.filter((e) => fresh.some((t) => e.startsAt < t.endsAt && e.endsAt > t.startsAt));
  return { fresh, overlapping: overlapping.map((e) => `${e.startsAt}–${e.endsAt}`) };
}

// ---------------------------------------------------------------------------
// Festival
// ---------------------------------------------------------------------------

export interface FestivalInput {
  name: string;
  shortName: string;
  descriptionCs: string;
  descriptionEn: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: "draft" | "published" | "archived";
}

export async function updateFestival(slug: string, input: FestivalInput, confirmed = false): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    if (!input.name.trim()) return fail(await m("Vyplň název festivalu.", "Enter the festival name."));
    if (input.shortName.trim().length > 15) {
      return fail(await m("Krátký název může mít nejvýš 15 znaků.", "The short name can have at most 15 characters."));
    }
    if (input.endDate < input.startDate) return fail(await m("Konec festivalu je před začátkem.", "The festival ends before it starts."));
    const dates = datesBetween(input.startDate, input.endDate);
    if (dates.length > 30) return fail(await m("Festival může trvat nejvýš 30 dní.", "A festival can last at most 30 days."));

    // Dny festivalu podle termínu; den s programem nelze odebrat.
    const { data: days } = await db.from("days").select("id, date").eq("festival_id", festivalId);
    const toRemove = (days ?? []).filter((d) => !dates.includes(d.date));
    if (toRemove.length && !confirmed) {
      // Sloty odebíraného dne by se smazaly s ním – zeptat se.
      const { count } = await db.from("time_slots").select("id", { count: "exact", head: true }).in("day_id", toRemove.map((d) => d.id));
      if (count) {
        const removed = toRemove.map((d) => d.date).join(", ");
        return {
          ok: true,
          warning: await m(
            `Odebrané dny (${removed}) mají časové sloty, které se smažou. Pokračovat?`,
            `The removed days (${removed}) have time slots that will be deleted. Continue?`,
          ),
        };
      }
    }
    if (toRemove.length) {
      const { error } = await db.from("days").delete().in("id", toRemove.map((d) => d.id));
      if (error) {
        return fail(
          await m(
            "Nelze zkrátit termín: některý odebíraný den už má program. Nejdřív přesuň nebo smaž jeho lekce.",
            "Can't shorten the dates: a day being removed already has a program. Move or delete its lessons first.",
          ),
        );
      }
    }
    const existing = new Set((days ?? []).map((d) => d.date));
    const toAdd = dates.filter((d) => !existing.has(d)).map((date) => ({ festival_id: festivalId, date }));
    if (toAdd.length) {
      const { error } = await db.from("days").insert(toAdd);
      if (error) return fail(await dbError(error));
    }

    const { error } = await db
      .from("festivals")
      .update({
        name: input.name.trim(),
        short_name: clean(input.shortName),
        description_cs: clean(input.descriptionCs),
        description_en: clean(input.descriptionEn),
        start_date: input.startDate,
        end_date: input.endDate,
        timezone: input.timezone,
        status: input.status,
      })
      .eq("id", festivalId);
    if (error) return fail(await dbError(error));
    await log("festival", "update", festivalId, input.name.trim());
    return { ok: true };
  });
}

export interface NewFestivalInput {
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  timezone: string;
  leadEmail: string;
}

/** Správce platformy založí festival a pozve hlavního organizátora (PRD 4.1). */
export async function createFestival(input: NewFestivalInput): Promise<ActionResult<{ slug: string; invited: boolean }>> {
  const db = await createServerSupabase();
  const { data: isAdmin } = await db.rpc("is_platform_admin");
  if (!isAdmin) return fail(await m("Festival může založit jen správce platformy.", "Only a platform admin can create a festival."));

  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return fail(
      await m(
        "Adresa smí obsahovat jen malá písmena bez diakritiky, čísla a pomlčky.",
        "The address can only contain lowercase letters without accents, numbers and hyphens.",
      ),
    );
  }
  if (RESERVED_SLUGS.includes(slug)) return fail(await m("Tuto adresu nelze použít.", "This address can't be used."));
  if (!input.name.trim()) return fail(await m("Vyplň název festivalu.", "Enter the festival name."));
  if (input.endDate < input.startDate) return fail(await m("Konec festivalu je před začátkem.", "The festival ends before it starts."));
  const dates = datesBetween(input.startDate, input.endDate);
  if (dates.length > 30) return fail(await m("Festival může trvat nejvýš 30 dní.", "A festival can last at most 30 days."));
  if (!EMAIL.test(input.leadEmail.trim())) return fail(await m("Zadej platný e-mail hlavního organizátora.", "Enter a valid email for the lead organizer."));

  const { data: festival, error } = await db
    .from("festivals")
    .insert({ name: input.name.trim(), slug, start_date: input.startDate, end_date: input.endDate, timezone: input.timezone })
    .select("id")
    .single();
  if (error) {
    return fail(
      error.code === "23505"
        ? await m("Festival s touto adresou už existuje.", "A festival with this address already exists.")
        : await dbError(error),
    );
  }

  // Když se něco nepovede, festival se smaže, aby adresa nezůstala zablokovaná.
  const { error: daysError } = await db.from("days").insert(dates.map((date) => ({ festival_id: festival.id, date })));
  const lead = daysError ? fail(await dbError(daysError)) : await addOrganizer(db, festival.id, input.leadEmail, "lead_organizer");
  if (!lead.ok) {
    await db.from("festivals").delete().eq("id", festival.id);
    return lead;
  }
  updateTag(FESTIVALS_TAG);
  return { ok: true, data: { slug, invited: lead.data === "invited" } };
}

// ---------------------------------------------------------------------------
// Časové sloty
// ---------------------------------------------------------------------------

export async function generateSlots(
  slug: string,
  dayId: string,
  opts: { start: string; minutes: number; pause: number; count: number },
  confirmed = false,
): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    if (opts.minutes < 5 || opts.count < 1 || opts.count > 30) {
      return fail(await m("Zkontroluj délku a počet slotů.", "Check the slot length and count."));
    }
    const { fresh, overlapping } = await checkSlots(db, dayId, generateSlotTimes(opts.start, opts.minutes, opts.pause, opts.count));
    if (!fresh.length) return fail(await m("Tyto sloty už den má.", "This day already has these time slots."));
    if (overlapping.length && !confirmed) {
      const list = overlapping.join(", ");
      return { ok: true, warning: await m(`Nové sloty se překrývají s ${list}. Přesto přidat?`, `The new time slots overlap with ${list}. Add anyway?`) };
    }
    const { error } = await db
      .from("time_slots")
      .insert(fresh.map((t) => ({ festival_id: festivalId, day_id: dayId, starts_at: t.startsAt, ends_at: t.endsAt })));
    if (error) return fail(await dbError(error));
    await log("slots", "create", dayId, `${csCount(fresh.length, ["slot", "sloty", "slotů"])} od ${opts.start}`);
    return { ok: true };
  });
}

export async function copySlots(slug: string, fromDayId: string, toDayId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const { data: source } = await db.from("time_slots").select("starts_at, ends_at").eq("day_id", fromDayId);
    if (!source?.length) return fail(await m("Zdrojový den nemá žádné sloty.", "The source day has no slots."));
    const { count } = await db.from("time_slots").select("id", { count: "exact", head: true }).eq("day_id", toDayId);
    if (count) return fail(await m("Cílový den už sloty má. Nejdřív je smaž.", "The target day already has slots. Delete them first."));
    const { error } = await db
      .from("time_slots")
      .insert(source.map((s) => ({ festival_id: festivalId, day_id: toDayId, starts_at: s.starts_at, ends_at: s.ends_at })));
    if (error) return fail(await dbError(error));
    await log("slots", "create", toDayId, `kopie: ${csCount(source.length, ["slot", "sloty", "slotů"])}`);
    return { ok: true };
  });
}

export async function saveSlot(
  slug: string,
  slot: { id?: string; dayId: string; startsAt: string; endsAt: string },
  confirmed = false,
): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    if (slot.endsAt <= slot.startsAt) return fail(await m("Konec slotu musí být po začátku.", "The slot must end after it starts."));
    const { fresh, overlapping } = await checkSlots(db, slot.dayId, [{ startsAt: slot.startsAt, endsAt: slot.endsAt }], slot.id);
    if (!fresh.length) return fail(await m("Takový slot už den má.", "This day already has this time slot."));
    if (overlapping.length && !confirmed) {
      const list = overlapping.join(", ");
      return { ok: true, warning: await m(`Slot se překrývá s ${list}. Přesto uložit?`, `The time slot overlaps with ${list}. Save anyway?`) };
    }
    const row = { festival_id: festivalId, day_id: slot.dayId, starts_at: slot.startsAt, ends_at: slot.endsAt };
    const { error } = slot.id ? await db.from("time_slots").update(row).eq("id", slot.id) : await db.from("time_slots").insert(row);
    if (error) return fail(await dbError(error));
    await log("slot", slot.id ? "update" : "create", slot.id ?? null, `${slot.startsAt}–${slot.endsAt}`);
    return { ok: true };
  });
}

export async function deleteSlot(slug: string, slotId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data: slot } = await db.from("time_slots").select("starts_at, ends_at").eq("id", slotId).single();
    const { error } = await db.from("time_slots").delete().eq("id", slotId);
    if (error) {
      return fail(
        error.code === "23503"
          ? await m("Ve slotu jsou lekce. Nejdřív je přesuň nebo smaž.", "The slot has lessons. Move or delete them first.")
          : await dbError(error),
      );
    }
    await log("slot", "delete", slotId, slot ? `${slot.starts_at.slice(0, 5)}–${slot.ends_at.slice(0, 5)}` : "");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Místnosti a styly
// ---------------------------------------------------------------------------

export async function saveRoom(slug: string, room: { id?: string; name: string }): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    if (!room.name.trim()) return fail(await m("Vyplň název místnosti.", "Enter the room name."));
    let error;
    if (room.id) {
      ({ error } = await db.from("rooms").update({ name: room.name.trim() }).eq("id", room.id));
    } else {
      const { data: rooms } = await db.from("rooms").select("position").eq("festival_id", festivalId);
      ({ error } = await db.from("rooms").insert({ festival_id: festivalId, name: room.name.trim(), position: nextPosition(rooms) }));
    }
    if (error) return fail(await dbError(error));
    await log("room", room.id ? "update" : "create", room.id ?? null, room.name.trim());
    return { ok: true };
  });
}

export async function reorderRooms(slug: string, ids: string[]): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    for (const [position, id] of ids.entries()) {
      const { error } = await db.from("rooms").update({ position }).eq("id", id);
      if (error) return fail(await dbError(error));
    }
    await log("room", "update", null, "pořadí místností");
    return { ok: true };
  });
}

export async function deleteRoom(slug: string, roomId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data: room } = await db.from("rooms").select("name").eq("id", roomId).single();
    const { error } = await db.from("rooms").delete().eq("id", roomId);
    if (error) {
      return fail(
        error.code === "23503"
          ? await m(
              "V místnosti jsou lekce nebo párty. Nejdřív je přesuň nebo smaž.",
              "The room has lessons or parties. Move or delete them first.",
            )
          : await dbError(error),
      );
    }
    await log("room", "delete", roomId, room?.name ?? "");
    return { ok: true };
  });
}

export async function saveStyle(slug: string, style: { id?: string; name: string; color: string }): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    if (!style.name.trim()) return fail(await m("Vyplň název stylu.", "Enter the style name."));
    if (!/^#[0-9A-Fa-f]{6}$/.test(style.color)) {
      return fail(await m("Barva musí být ve tvaru #RRGGBB.", "The color must be in #RRGGBB format."));
    }
    const row = { festival_id: festivalId, name: style.name.trim(), color: style.color.toUpperCase() };
    const { error } = style.id ? await db.from("styles").update(row).eq("id", style.id) : await db.from("styles").insert(row);
    if (error) return fail(await dbError(error));
    await log("style", style.id ? "update" : "create", style.id ?? null, style.name.trim());
    return { ok: true };
  });
}

export async function deleteStyle(slug: string, styleId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data: style } = await db.from("styles").select("name").eq("id", styleId).single();
    const { error } = await db.from("styles").delete().eq("id", styleId);
    if (error) return fail(await dbError(error));
    await log("style", "delete", styleId, style?.name ?? "");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Lekce
// ---------------------------------------------------------------------------

export interface LessonInput {
  id?: string;
  dayId: string;
  startSlotId: string;
  endSlotId: string;
  roomId: string;
  styleId: string | null;
  titleCs: string;
  titleEn: string;
  descriptionCs: string;
  descriptionEn: string;
  level: number;
  teacherIds: string[];
}

/**
 * Uloží lekci. Když učitel ve stejném čase učí jinde, vrátí varování a uloží až
 * po potvrzení (`confirmed`) – PRD 5.4.
 */
export async function saveLesson(slug: string, input: LessonInput, confirmed = false): Promise<ActionResult<{ id: string }>> {
  return withFestival<{ id: string }>(slug, async ({ db, festivalId, log }) => {
    const title = clean(input.titleCs) ?? clean(input.titleEn);
    if (!title) return fail(await m("Vyplň název lekce (alespoň v jednom jazyce).", "Enter the lesson title (in at least one language)."));
    if (!input.teacherIds.length) return fail(await m("Vyber alespoň jednoho učitele.", "Select at least one teacher."));
    if (input.level < 0 || input.level > 3 || (input.level * 2) % 1 !== 0) return fail(await m("Neplatný level.", "Invalid level."));

    const { data: slots } = await db.from("time_slots").select("id, starts_at, ends_at").eq("day_id", input.dayId);
    const start = slots?.find((s) => s.id === input.startSlotId);
    const end = slots?.find((s) => s.id === input.endSlotId);
    if (!start || !end || end.ends_at <= start.starts_at) {
      return fail(await m("Neplatný rozsah časových slotů.", "Invalid time slot range."));
    }

    if (!confirmed) {
      const conflicts = await teacherConflicts(db, festivalId, input, start.starts_at, end.ends_at);
      if (conflicts.length) {
        const names = conflicts.join(", ");
        return {
          ok: true,
          warning: await m(
            `V tomto čase už učí jinde: ${names}. Opravdu uložit?`,
            `Already teaching elsewhere at this time: ${names}. Save anyway?`,
          ),
        };
      }
    }

    const row = {
      festival_id: festivalId,
      day_id: input.dayId,
      start_slot_id: input.startSlotId,
      end_slot_id: input.endSlotId,
      room_id: input.roomId,
      style_id: input.styleId,
      title_cs: clean(input.titleCs),
      title_en: clean(input.titleEn),
      description_cs: clean(input.descriptionCs),
      description_en: clean(input.descriptionEn),
      level: input.level,
    };
    const res = input.id
      ? await db.from("lessons").update(row).eq("id", input.id).select("id").single()
      : await db.from("lessons").insert(row).select("id").single();
    if (res.error) return fail(await dbError(res.error));
    const id = res.data.id as string;

    // Učitelé: smazat odebrané, přidat nové (změna spouští štítek „Změna“).
    const { data: current } = await db.from("lesson_teachers").select("teacher_profile_id").eq("lesson_id", id);
    const before = new Set((current ?? []).map((r) => r.teacher_profile_id as string));
    const removed = [...before].filter((t) => !input.teacherIds.includes(t));
    const added = input.teacherIds.filter((t) => !before.has(t));
    if (removed.length) await db.from("lesson_teachers").delete().eq("lesson_id", id).in("teacher_profile_id", removed);
    if (added.length) {
      const { error } = await db.from("lesson_teachers").insert(added.map((t) => ({ lesson_id: id, teacher_profile_id: t })));
      if (error) {
        // Nová lekce bez učitelů by blokovala sál i opakované uložení – raději ji smazat.
        if (!input.id) await db.from("lessons").delete().eq("id", id);
        return fail(await dbError(error));
      }
    }

    await log("lesson", input.id ? "update" : "create", id, title);
    return { ok: true, data: { id } };
  });
}

async function teacherConflicts(
  db: Awaited<ReturnType<typeof createServerSupabase>>,
  festivalId: string,
  input: LessonInput,
  startsAt: string,
  endsAt: string,
) {
  const { data } = await db
    .from("lessons")
    .select("id, start:time_slots!start_slot_id(starts_at), end:time_slots!end_slot_id(ends_at), lesson_teachers(teacher_profiles(id, name))")
    .eq("festival_id", festivalId)
    .eq("day_id", input.dayId)
    .eq("cancelled", false)
    .neq("id", input.id ?? "00000000-0000-0000-0000-000000000000");
  const names = new Set<string>();
  for (const l of (data ?? []) as unknown as {
    start: { starts_at: string };
    end: { ends_at: string };
    lesson_teachers: { teacher_profiles: { id: string; name: string } }[];
  }[]) {
    if (!(l.start.starts_at < endsAt && l.end.ends_at > startsAt)) continue;
    for (const lt of l.lesson_teachers) {
      if (input.teacherIds.includes(lt.teacher_profiles.id)) names.add(lt.teacher_profiles.name);
    }
  }
  return [...names];
}

export async function setLessonCancelled(slug: string, lessonId: string, cancelled: boolean): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data, error } = await db.from("lessons").update({ cancelled }).eq("id", lessonId).select("title_cs, title_en").single();
    if (error) return fail(await dbError(error));
    await log("lesson", cancelled ? "cancel" : "restore", lessonId, data.title_cs ?? data.title_en ?? "");
    return { ok: true };
  });
}

export async function deleteLesson(slug: string, lessonId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data } = await db.from("lessons").select("title_cs, title_en").eq("id", lessonId).single();
    const { error } = await db.from("lessons").delete().eq("id", lessonId);
    if (error) return fail(await dbError(error));
    await log("lesson", "delete", lessonId, data?.title_cs ?? data?.title_en ?? "");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Párty
// ---------------------------------------------------------------------------

export interface PartyInput {
  id?: string;
  dayId: string;
  startsAt: string;
  endsAt: string;
  roomId: string | null;
  place: string;
  titleCs: string;
  titleEn: string;
  descriptionCs: string;
  descriptionEn: string;
  cancelled: boolean;
}

export async function saveParty(slug: string, input: PartyInput): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const title = clean(input.titleCs) ?? clean(input.titleEn);
    if (!title) return fail(await m("Vyplň název párty.", "Enter the party name."));
    if (!input.roomId && !clean(input.place)) return fail(await m("Vyber místnost, nebo napiš místo.", "Select a room or enter a place."));
    const row = {
      festival_id: festivalId,
      day_id: input.dayId,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      room_id: input.roomId,
      place: input.roomId ? null : clean(input.place),
      title_cs: clean(input.titleCs),
      title_en: clean(input.titleEn),
      description_cs: clean(input.descriptionCs),
      description_en: clean(input.descriptionEn),
      cancelled: input.cancelled,
    };
    const { error } = input.id ? await db.from("parties").update(row).eq("id", input.id) : await db.from("parties").insert(row);
    if (error) return fail(await dbError(error));
    await log("party", input.id ? "update" : "create", input.id ?? null, title);
    return { ok: true };
  });
}

export async function deleteParty(slug: string, partyId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data } = await db.from("parties").select("title_cs, title_en").eq("id", partyId).single();
    const { error } = await db.from("parties").delete().eq("id", partyId);
    if (error) return fail(await dbError(error));
    await log("party", "delete", partyId, data?.title_cs ?? data?.title_en ?? "");
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Učitelé
// ---------------------------------------------------------------------------

/** Hledání učitelů podle jména napříč platformou (PRD 4). */
export async function searchTeachers(query: string): Promise<{ id: string; name: string }[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const db = await createServerSupabase();
  const { data } = await db
    .from("teacher_profiles")
    .select("id, name")
    .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
    .order("name")
    .limit(10);
  return data ?? [];
}

export async function addTeacherToFestival(slug: string, teacherId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const { error } = await db.from("festival_teachers").upsert({ festival_id: festivalId, teacher_profile_id: teacherId });
    if (error) return fail(await dbError(error));
    const { data } = await db.from("teacher_profiles").select("name").eq("id", teacherId).single();
    await log("teacher", "create", teacherId, data?.name ?? "");
    return { ok: true };
  });
}

export async function createTeacher(slug: string, input: { name: string; bioCs: string; bioEn: string }): Promise<ActionResult<{ id: string }>> {
  return withFestival<{ id: string }>(slug, async ({ db, festivalId, log }) => {
    if (!input.name.trim()) return fail(await m("Vyplň jméno učitele.", "Enter the teacher's name."));
    const { data, error } = await db.rpc("create_teacher", {
      fid: festivalId,
      teacher_name: input.name.trim(),
      bio_cs: clean(input.bioCs),
      bio_en: clean(input.bioEn),
    });
    if (error) return fail(await dbError(error));
    await log("teacher", "create", data as string, input.name.trim());
    return { ok: true, data: { id: data as string } };
  });
}

export async function removeTeacherFromFestival(slug: string, teacherId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const { count } = await db
      .from("lesson_teachers")
      .select("lesson_id, lessons!inner(festival_id)", { count: "exact", head: true })
      .eq("teacher_profile_id", teacherId)
      .eq("lessons.festival_id", festivalId);
    if (count) {
      return fail(
        await m(
          "Učitel má na festivalu lekce. Nejdřív ho z nich odeber.",
          "The teacher has lessons at this festival. Remove them from those lessons first.",
        ),
      );
    }
    // Nevyřízená pozvánka by po odebrání zůstala platná a nešla by zrušit.
    const { error: inviteError } = await db
      .from("invitations")
      .update({ status: "revoked" })
      .eq("festival_id", festivalId)
      .eq("teacher_profile_id", teacherId)
      .eq("status", "pending");
    if (inviteError) return fail(await dbError(inviteError));
    const { error } = await db.from("festival_teachers").delete().eq("festival_id", festivalId).eq("teacher_profile_id", teacherId);
    if (error) return fail(await dbError(error));
    const { data } = await db.from("teacher_profiles").select("name").eq("id", teacherId).single();
    await log("teacher", "delete", teacherId, data?.name ?? "");
    return { ok: true };
  });
}

/** Úprava medailonku – projeví se na všech festivalech, historii zapisuje databáze (PRD 5.4). */
export async function updateTeacherProfile(
  slug: string,
  teacherId: string,
  input: { name: string; bioCs: string; bioEn: string; photoUrl: string },
): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    if (!input.name.trim()) return fail(await m("Vyplň jméno učitele.", "Enter the teacher's name."));
    if (clean(input.photoUrl) && !/^https:\/\//.test(input.photoUrl.trim())) {
      return fail(await m("Odkaz na fotku musí začínat https://.", "The photo link must start with https://."));
    }
    const { data: updated, error } = await db
      .from("teacher_profiles")
      .update({ name: input.name.trim(), bio_cs: clean(input.bioCs), bio_en: clean(input.bioEn), photo_url: clean(input.photoUrl) })
      .eq("id", teacherId)
      .select("id");
    if (error) return fail(await dbError(error));
    if (!updated?.length) {
      return fail(
        await m(
          "Učitel má vlastní účet – medailonek si upravuje sám.",
          "The teacher has their own account and edits their bio themselves.",
        ),
      );
    }
    await log("teacher", "update", teacherId, input.name.trim());
    // Globální medailonek se zobrazuje i na dalších festivalech – obnovit jejich cache.
    const { data: festivals } = await db.from("festival_teachers").select("festivals(slug)").eq("teacher_profile_id", teacherId);
    for (const row of festivals ?? []) {
      const other = (row.festivals as unknown as { slug: string } | null)?.slug;
      if (other) updateTag(festivalTag(other));
    }
    return { ok: true };
  });
}

/** Vlastní verze medailonku jen pro tento festival – organizátor ji může upravit vždy. */
export async function updateFestivalTeacherBio(
  slug: string,
  teacherId: string,
  input: { bioCs: string; bioEn: string; photoUrl: string },
): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    if (clean(input.photoUrl) && !input.photoUrl.trim().startsWith("https://")) {
      return fail(await m("Odkaz na fotku musí začínat https://.", "The photo link must start with https://."));
    }
    const { data: before } = await db
      .from("festival_teachers")
      .select("photo_url")
      .eq("festival_id", festivalId)
      .eq("teacher_profile_id", teacherId)
      .maybeSingle();
    const { data, error } = await db
      .from("festival_teachers")
      .update({ bio_cs: clean(input.bioCs), bio_en: clean(input.bioEn), photo_url: clean(input.photoUrl) })
      .eq("festival_id", festivalId)
      .eq("teacher_profile_id", teacherId)
      .select("teacher_profiles(name)")
      .single();
    if (error) return fail(await dbError(error));
    await removeImages(db, [before?.photo_url], [clean(input.photoUrl)]);
    const name = (data.teacher_profiles as unknown as { name: string } | null)?.name ?? "";
    await log("teacher", "update", teacherId, `${name} – medailonek pro festival`);
    return { ok: true };
  });
}

/**
 * Propojí učitele s účtem: existující účet (přesný e-mail) se povýší hned,
 * jinak vznikne pozvánka, která se přijme po prvním přihlášení (PRD 4).
 */
export async function inviteTeacher(slug: string, teacherId: string, email: string): Promise<ActionResult<"linked" | "invited">> {
  return withFestival<"linked" | "invited">(slug, async ({ db, festivalId, userId: me, log }) => {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) return fail(await m("Zadej platný e-mail.", "Enter a valid email."));
    const { data: userId } = await db.rpc("find_user_by_email", { lookup: address, fid: festivalId });
    if (userId) {
      const { error } = await db.rpc("link_teacher_account", { fid: festivalId, tid: teacherId, uid: userId });
      if (error) return fail(await dbError(error));
      await log("teacher", "update", teacherId, `propojen s účtem ${address}`);
      return { ok: true, data: "linked" };
    }
    const { error } = await db
      .from("invitations")
      .insert({ festival_id: festivalId, email: address, role: "teacher", teacher_profile_id: teacherId, invited_by: me });
    if (error) return fail(await dbError(error));
    await log("invitation", "create", teacherId, `učitel ${address}`);
    return { ok: true, data: "invited" };
  });
}

// ---------------------------------------------------------------------------
// Organizátoři (jen hlavní organizátor – hlídá RLS)
// ---------------------------------------------------------------------------

async function addOrganizer(
  db: Awaited<ReturnType<typeof createServerSupabase>>,
  festivalId: string,
  email: string,
  role: "lead_organizer" | "organizer",
): Promise<ActionResult<"added" | "invited">> {
  const address = email.trim().toLowerCase();
  if (!EMAIL.test(address)) return fail(await m("Zadej platný e-mail.", "Enter a valid email."));
  const { data: userId } = await db.rpc("find_user_by_email", { lookup: address, fid: festivalId });
  const {
    data: { user: me },
  } = await db.auth.getUser();

  if (userId) {
    // Už je členem: pozvánka smí roli jen zvýšit, snížit ji jde jen v seznamu organizátorů.
    const { data: member } = await db.from("festival_members").select("role").eq("festival_id", festivalId).eq("user_id", userId).maybeSingle();
    if (member && (member.role === role || member.role === "lead_organizer")) {
      return fail(
        member.role === "lead_organizer"
          ? await m("Už je hlavním organizátorem. Roli můžeš změnit v seznamu organizátorů.", "Already a lead organizer. You can change the role in the list of organizers.")
          : await m("Už je organizátorem festivalu.", "Already an organizer of this festival."),
      );
    }
    const { error } = member
      ? await db.from("festival_members").update({ role }).eq("festival_id", festivalId).eq("user_id", userId)
      : await db.from("festival_members").insert({ festival_id: festivalId, user_id: userId, role });
    if (error) return fail(await dbError(error));
    return { ok: true, data: "added" };
  }
  const { error } = await db.from("invitations").insert({ festival_id: festivalId, email: address, role, invited_by: me?.id });
  if (error) return fail(await dbError(error));
  return { ok: true, data: "invited" };
}

export async function inviteOrganizer(slug: string, email: string, role: "lead_organizer" | "organizer"): Promise<ActionResult<"added" | "invited">> {
  return withFestival<"added" | "invited">(slug, async ({ db, festivalId, log }) => {
    const { data: isLead } = await db.rpc("is_lead_organizer", { fid: festivalId });
    if (!isLead) return fail(await m("Organizátory spravuje jen hlavní organizátor.", "Only the lead organizer can manage organizers."));
    const result = await addOrganizer(db, festivalId, email, role);
    if (result.ok) await log("organizer", "create", null, `${email.trim()} (${role === "lead_organizer" ? "hlavní" : "organizátor"})`);
    return result;
  });
}

export async function setOrganizerRole(slug: string, userId: string, role: "lead_organizer" | "organizer"): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const { data: isLead } = await db.rpc("is_lead_organizer", { fid: festivalId });
    if (!isLead) return fail(await m("Organizátory spravuje jen hlavní organizátor.", "Only the lead organizer can manage organizers."));
    const { error } = await db.from("festival_members").update({ role }).eq("festival_id", festivalId).eq("user_id", userId);
    if (error) return fail(await dbError(error));
    await log("organizer", "update", userId, role === "lead_organizer" ? "povýšen na hlavního organizátora" : "změněn na organizátora");
    return { ok: true };
  });
}

export async function removeOrganizer(slug: string, userId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const { data: isLead } = await db.rpc("is_lead_organizer", { fid: festivalId });
    if (!isLead) return fail(await m("Organizátory spravuje jen hlavní organizátor.", "Only the lead organizer can manage organizers."));
    const { error } = await db.from("festival_members").delete().eq("festival_id", festivalId).eq("user_id", userId);
    if (error) return fail(await dbError(error));
    await log("organizer", "delete", userId, "odebrán z organizátorů");
    return { ok: true };
  });
}

export async function revokeInvitation(slug: string, invitationId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data, error } = await db.from("invitations").update({ status: "revoked" }).eq("id", invitationId).select("email").single();
    if (error) return fail(await dbError(error));
    await log("invitation", "delete", invitationId, data.email);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Praktické informace
// ---------------------------------------------------------------------------

export async function saveInfoPage(
  slug: string,
  page: { id?: string; titleCs: string; titleEn: string; bodyCs: string; bodyEn: string },
): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const title = clean(page.titleCs) ?? clean(page.titleEn);
    if (!title) return fail(await m("Vyplň nadpis stránky.", "Enter the page title."));
    const row = { title_cs: clean(page.titleCs), title_en: clean(page.titleEn), body_cs: clean(page.bodyCs), body_en: clean(page.bodyEn) };
    let error;
    if (page.id) {
      ({ error } = await db.from("info_pages").update(row).eq("id", page.id));
    } else {
      const { data: pages } = await db.from("info_pages").select("position").eq("festival_id", festivalId);
      ({ error } = await db.from("info_pages").insert({ ...row, festival_id: festivalId, position: nextPosition(pages) }));
    }
    if (error) return fail(await dbError(error));
    await log("info", page.id ? "update" : "create", page.id ?? null, title);
    return { ok: true };
  });
}

export async function deleteInfoPage(slug: string, pageId: string): Promise<ActionResult> {
  return withFestival(slug, async ({ db, log }) => {
    const { data } = await db.from("info_pages").select("title_cs, title_en").eq("id", pageId).single();
    const { error } = await db.from("info_pages").delete().eq("id", pageId);
    if (error) return fail(await dbError(error));
    await log("info", "delete", pageId, data?.title_cs ?? data?.title_en ?? "");
    return { ok: true };
  });
}

export async function reorderInfoPages(slug: string, ids: string[]): Promise<ActionResult> {
  return withFestival(slug, async ({ db }) => {
    for (const [position, id] of ids.entries()) {
      const { error } = await db.from("info_pages").update({ position }).eq("id", id);
      if (error) return fail(await dbError(error));
    }
    return { ok: true };
  });
}

export async function signOut() {
  const db = await createServerSupabase();
  await db.auth.signOut();
}

// ---------------------------------------------------------------------------
// Vizuální identita (jen hlavní organizátor – hlídá i databáze)
// ---------------------------------------------------------------------------

export interface BrandingInput {
  colors: string[];
  font: string;
  logoWideUrl: string;
  logoSquareUrl: string;
  bannerUrl: string;
}

const FONT_KEYS = ["inter", "poppins", "montserrat", "nunito", "playfair"];

/** Obrázky smí pocházet jen z našeho úložiště. */
function isStorageUrl(url: string) {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/`;
  return url === "" || url.startsWith(base);
}

export async function updateBranding(slug: string, input: BrandingInput): Promise<ActionResult> {
  return withFestival(slug, async ({ db, festivalId, log }) => {
    const { data: isLead } = await db.rpc("is_lead_organizer", { fid: festivalId });
    if (!isLead) {
      return fail(await m("Vzhled festivalu mění jen hlavní organizátor.", "Only the lead organizer can change the festival appearance."));
    }
    const colors = input.colors.map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (colors.length < 1 || colors.length > 5 || colors.some((c) => !/^#[0-9A-F]{6}$/.test(c))) {
      return fail(await m("Zadej 1–5 barev ve tvaru #RRGGBB.", "Enter 1–5 colors in #RRGGBB format."));
    }
    if (!FONT_KEYS.includes(input.font)) return fail(await m("Neznámé písmo.", "Unknown font."));
    if (![input.logoWideUrl, input.logoSquareUrl, input.bannerUrl].every(isStorageUrl)) {
      return fail(await m("Obrázky nahraj přes tlačítko Nahrát.", "Upload images using the Upload button."));
    }

    const { data: before } = await db.from("festivals").select("logo_wide_url, logo_square_url, banner_url").eq("id", festivalId).single();
    const { error } = await db
      .from("festivals")
      .update({
        colors,
        font: input.font,
        logo_wide_url: input.logoWideUrl || null,
        logo_square_url: input.logoSquareUrl || null,
        banner_url: input.bannerUrl || null,
      })
      .eq("id", festivalId);
    if (error) return fail(await dbError(error));
    // Nahrazené obrázky už nic nepoužívá.
    await removeImages(db, [before?.logo_wide_url, before?.logo_square_url, before?.banner_url], [input.logoWideUrl, input.logoSquareUrl, input.bannerUrl]);
    await log("festival", "update", festivalId, "vzhled festivalu");
    return { ok: true };
  });
}
