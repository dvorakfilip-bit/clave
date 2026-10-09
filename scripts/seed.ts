/**
 * Nahraje ukázkový festival (src/lib/demo-data.ts) do Supabase.
 * Spuštění: npm run seed  (potřebuje SUPABASE_SERVICE_ROLE_KEY v .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import { demoProgram as p } from "../src/lib/demo-data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const fid = p.festival.id;

async function upsert(table: string, rows: object[]) {
  if (!rows.length) return;
  const { error } = await db.from(table).upsert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✓ ${table} (${rows.length})`);
}

async function main() {
  const f = p.festival;
  await upsert("festivals", [
    {
      id: fid,
      slug: f.slug,
      name: f.name,
      description_cs: f.descriptionCs,
      description_en: f.descriptionEn,
      start_date: f.startDate,
      end_date: f.endDate,
      timezone: f.timezone,
      status: f.status,
      colors: f.colors,
      font: f.font,
    },
  ]);
  await upsert("days", p.days.map((d) => ({ id: d.id, festival_id: fid, date: d.date })));
  await upsert(
    "time_slots",
    p.slots.map((s) => ({ id: s.id, festival_id: fid, day_id: s.dayId, starts_at: s.startsAt, ends_at: s.endsAt })),
  );
  await upsert("rooms", p.rooms.map((r) => ({ id: r.id, festival_id: fid, name: r.name, position: r.position })));
  await upsert("styles", p.styles.map((s) => ({ id: s.id, festival_id: fid, name: s.name, color: s.color })));
  await upsert(
    "teacher_profiles",
    p.teachers.map((t) => ({ id: t.id, name: t.name, photo_url: t.photoUrl, bio_cs: t.bioCs, bio_en: t.bioEn })),
  );
  await upsert("festival_teachers", p.teachers.map((t) => ({ festival_id: fid, teacher_profile_id: t.id })));
  await upsert(
    "lessons",
    p.lessons.map((l) => ({
      id: l.id,
      festival_id: fid,
      day_id: l.dayId,
      start_slot_id: l.startSlotId,
      end_slot_id: l.endSlotId,
      room_id: l.roomId,
      style_id: l.styleId,
      title_cs: l.titleCs,
      title_en: l.titleEn,
      description_cs: l.descriptionCs,
      description_en: l.descriptionEn,
      level: l.level,
      cancelled: l.cancelled,
      changed_at: l.changedAt,
    })),
  );
  await upsert(
    "lesson_teachers",
    p.lessons.flatMap((l) => l.teacherIds.map((t) => ({ lesson_id: l.id, teacher_profile_id: t }))),
  );
  await upsert(
    "parties",
    p.parties.map((x) => ({
      id: x.id,
      festival_id: fid,
      day_id: x.dayId,
      starts_at: x.startsAt,
      ends_at: x.endsAt,
      room_id: x.roomId,
      place: x.place,
      title_cs: x.titleCs,
      title_en: x.titleEn,
      cancelled: x.cancelled,
    })),
  );
  await upsert(
    "info_pages",
    p.infoPages.map((i) => ({
      id: i.id,
      festival_id: fid,
      position: i.position,
      title_cs: i.titleCs,
      title_en: i.titleEn,
      body_cs: i.bodyCs,
      body_en: i.bodyEn,
    })),
  );
  console.log(`\nHotovo: /${f.slug}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
