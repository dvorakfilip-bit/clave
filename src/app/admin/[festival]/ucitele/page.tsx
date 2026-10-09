import { TeachersEditor } from "@/components/admin/TeachersEditor";
import { loadAdminFestival, loadInvitations } from "@/lib/admin/data";

export default async function TeachersAdminPage({ params }: PageProps<"/admin/[festival]/ucitele">) {
  const { festival: slug } = await params;
  const { program, db } = await loadAdminFestival(slug);
  const ids = program.teachers.map((t) => t.id);
  const [{ data: linked }, invitations, { data: revisions }] = await Promise.all([
    db.from("teacher_profiles").select("id").in("id", ids).not("user_id", "is", null),
    loadInvitations(db, program.festival.id),
    db.from("teacher_profile_revisions").select("profile_id, created_at").in("profile_id", ids).order("created_at", { ascending: false }),
  ]);

  const lastEdit = new Map<string, string>();
  for (const r of revisions ?? []) if (!lastEdit.has(r.profile_id)) lastEdit.set(r.profile_id, r.created_at);

  return (
    <TeachersEditor
      program={program}
      linkedIds={(linked ?? []).map((t) => t.id)}
      invitations={invitations.filter((i) => i.role === "teacher")}
      lastEdit={Object.fromEntries(lastEdit)}
    />
  );
}
