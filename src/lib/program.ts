import { cacheLife, cacheTag } from "next/cache";
import { demoProgram } from "./demo-data";
import { createPublicClient } from "./supabase/public";
import type { FestivalProgram, FestivalSummary } from "./types";

export const festivalTag = (slug: string) => `festival:${slug}`;
export const FESTIVALS_TAG = "festivals";

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : t);

/**
 * Veřejná data festivalu. Cachují se dlouhodobě a po každé úpravě
 * organizátora se obnoví přes `revalidateTag(festivalTag(slug))`.
 */
export async function getFestivalProgram(slug: string): Promise<FestivalProgram | null> {
  "use cache";
  cacheTag(festivalTag(slug));
  cacheLife("max");

  const db = createPublicClient();
  if (!db) return slug === demoProgram.festival.slug ? demoProgram : null;

  const { data: f } = await db.from("festivals").select("*").eq("slug", slug).maybeSingle();
  if (!f) return null;

  const id = f.id as string;
  const [days, slots, rooms, styles, lessons, parties, infoPages, festivalTeachers] = await Promise.all([
    db.from("days").select("*").eq("festival_id", id).order("date"),
    db.from("time_slots").select("*").eq("festival_id", id).order("starts_at"),
    db.from("rooms").select("*").eq("festival_id", id).order("position"),
    db.from("styles").select("*").eq("festival_id", id).order("name"),
    db.from("lessons").select("*, lesson_teachers(teacher_profile_id)").eq("festival_id", id),
    db.from("parties").select("*").eq("festival_id", id).order("starts_at"),
    db.from("info_pages").select("*").eq("festival_id", id).order("position"),
    db.from("festival_teachers").select("teacher_profiles(*)").eq("festival_id", id),
  ]);

  const firstError = [days, slots, rooms, styles, lessons, parties, infoPages, festivalTeachers].find((r) => r.error);
  if (firstError?.error) throw new Error(firstError.error.message);

  return {
    festival: {
      id,
      slug: f.slug,
      name: f.name,
      startDate: f.start_date,
      endDate: f.end_date,
      status: f.status,
      colors: f.colors,
      logoSquareUrl: f.logo_square_url,
      logoWideUrl: f.logo_wide_url,
      bannerUrl: f.banner_url,
      descriptionCs: f.description_cs,
      descriptionEn: f.description_en,
      timezone: f.timezone,
      font: f.font,
    },
    days: days.data!.map((d) => ({ id: d.id, date: d.date })),
    slots: slots.data!.map((s) => ({ id: s.id, dayId: s.day_id, startsAt: hhmm(s.starts_at)!, endsAt: hhmm(s.ends_at)! })),
    rooms: rooms.data!.map((r) => ({ id: r.id, name: r.name, position: r.position })),
    styles: styles.data!.map((s) => ({ id: s.id, name: s.name, color: s.color })),
    teachers: festivalTeachers
      .data!.map((ft) => ft.teacher_profiles as unknown as Record<string, string | null>)
      .filter(Boolean)
      .map((t) => ({ id: t.id!, name: t.name!, photoUrl: t.photo_url, bioCs: t.bio_cs, bioEn: t.bio_en }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    lessons: lessons.data!.map((l) => ({
      id: l.id,
      dayId: l.day_id,
      startSlotId: l.start_slot_id,
      endSlotId: l.end_slot_id,
      roomId: l.room_id,
      styleId: l.style_id,
      titleCs: l.title_cs,
      titleEn: l.title_en,
      descriptionCs: l.description_cs,
      descriptionEn: l.description_en,
      level: Number(l.level),
      cancelled: l.cancelled,
      changedAt: l.changed_at,
      teacherIds: (l.lesson_teachers as { teacher_profile_id: string }[]).map((lt) => lt.teacher_profile_id),
    })),
    parties: parties.data!.map((p) => ({
      id: p.id,
      dayId: p.day_id,
      startsAt: hhmm(p.starts_at)!,
      endsAt: hhmm(p.ends_at),
      roomId: p.room_id,
      place: p.place,
      titleCs: p.title_cs,
      titleEn: p.title_en,
      descriptionCs: p.description_cs,
      descriptionEn: p.description_en,
      cancelled: p.cancelled,
      changedAt: p.changed_at,
    })),
    infoPages: infoPages.data!.map((p) => ({
      id: p.id,
      position: p.position,
      titleCs: p.title_cs,
      titleEn: p.title_en,
      bodyCs: p.body_cs,
      bodyEn: p.body_en,
    })),
  };
}

/** Zveřejněné a archivované festivaly pro hlavní stránku platformy. */
export async function getPublicFestivals(): Promise<FestivalSummary[]> {
  "use cache";
  cacheTag(FESTIVALS_TAG);
  cacheLife("hours");

  const db = createPublicClient();
  if (!db) {
    const { festival } = demoProgram;
    return [festival];
  }

  const { data, error } = await db
    .from("festivals")
    .select("id, slug, name, start_date, end_date, status, colors, logo_square_url")
    .in("status", ["published", "archived"])
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);

  return data.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    startDate: f.start_date,
    endDate: f.end_date,
    status: f.status,
    colors: f.colors,
    logoSquareUrl: f.logo_square_url,
  }));
}
