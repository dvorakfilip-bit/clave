import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadProgram } from "@/lib/program";
import { createServerSupabase } from "@/lib/supabase/server";

/** Festival pro správu – čte se jako přihlášený organizátor, takže vidí i koncept. */
export async function loadAdminFestival(slug: string) {
  const user = await requireUser(`/admin/${slug}`);
  const db = await createServerSupabase();
  const program = await loadProgram(db, slug);
  if (!program) notFound();
  const [{ data: isOrganizer }, { data: isLead }] = await Promise.all([
    db.rpc("is_organizer", { fid: program.festival.id }),
    db.rpc("is_lead_organizer", { fid: program.festival.id }),
  ]);
  if (!isOrganizer) notFound();
  return { user, db, program, isLead: Boolean(isLead) };
}

export interface Invitation {
  id: string;
  email: string;
  role: "lead_organizer" | "organizer" | "teacher";
  teacherProfileId: string | null;
  createdAt: string;
}

export async function loadInvitations(db: Awaited<ReturnType<typeof createServerSupabase>>, festivalId: string): Promise<Invitation[]> {
  const { data } = await db
    .from("invitations")
    .select("id, email, role, teacher_profile_id, created_at")
    .eq("festival_id", festivalId)
    .eq("status", "pending")
    // Propadlé pozvánky už nejde přijmout – ve správě se nezobrazí a učitele jde pozvat znovu.
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    teacherProfileId: i.teacher_profile_id,
    createdAt: i.created_at,
  }));
}
