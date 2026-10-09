import { type TeacherBios, TeachersEditor } from "@/components/admin/TeachersEditor";
import { loadAdminFestival, loadInvitations } from "@/lib/admin/data";

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

export default async function TeachersAdminPage({ params }: PageProps<"/admin/[festival]/ucitele">) {
  const { festival: slug } = await params;
  const { program, db } = await loadAdminFestival(slug);
  const ids = program.teachers.map((t) => t.id);
  const [{ data: profiles }, { data: overrides }, invitations, { data: revisions }] = await Promise.all([
    db.from("teacher_profiles").select("id, name, photo_url, bio_cs, bio_en, user_id").in("id", ids),
    db.from("festival_teachers").select("teacher_profile_id, photo_url, bio_cs, bio_en").eq("festival_id", program.festival.id),
    loadInvitations(db, program.festival.id),
    db.from("teacher_profile_revisions").select("profile_id, created_at").in("profile_id", ids).order("created_at", { ascending: false }),
  ]);

  const lastEdit = new Map<string, string>();
  for (const r of revisions ?? []) if (!lastEdit.has(r.profile_id)) lastEdit.set(r.profile_id, r.created_at);

  const bios: Record<string, TeacherBios> = {};
  for (const p of profiles ?? []) {
    const o = overrides?.find((x) => x.teacher_profile_id === p.id);
    bios[p.id] = {
      global: { name: p.name, photoUrl: p.photo_url ?? "", bioCs: p.bio_cs ?? "", bioEn: p.bio_en ?? "" },
      festival: { photoUrl: o?.photo_url ?? "", bioCs: o?.bio_cs ?? "", bioEn: o?.bio_en ?? "" },
    };
  }

  return (
    <TeachersEditor
      program={program}
      bios={bios}
      linkedIds={(profiles ?? []).filter((t) => t.user_id).map((t) => t.id)}
      invitations={invitations.filter((i) => i.role === "teacher")}
      lastEdit={Object.fromEntries(lastEdit)}
    />
  );
}
