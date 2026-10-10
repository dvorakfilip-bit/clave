import { OrganizersEditor } from "@/components/admin/OrganizersEditor";
import { loadAdminFestival, loadInvitations } from "@/lib/admin/data";

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

export default async function OrganizersPage({ params }: PageProps<"/admin/[festival]/organizatori">) {
  const { festival: slug } = await params;
  const { program, db, isLead, user } = await loadAdminFestival(slug);
  const [{ data: members }, invitations] = await Promise.all([
    db.rpc("festival_organizers", { fid: program.festival.id }),
    loadInvitations(db, program.festival.id),
  ]);

  return (
    <OrganizersEditor
      slug={slug}
      festivalName={program.festival.name}
      isLead={isLead}
      currentUserId={user.id}
      members={(members ?? []) as { user_id: string; display_name: string; email: string; role: "lead_organizer" | "organizer" }[]}
      invitations={invitations.filter((i) => i.role !== "teacher")}
    />
  );
}
