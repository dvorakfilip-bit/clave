import { ImportExport } from "@/components/admin/ImportExport";
import { loadAdminFestival } from "@/lib/admin/data";

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

export default async function ImportPage({ params }: PageProps<"/admin/[festival]/import">) {
  const { festival: slug } = await params;
  const { program, db, user } = await loadAdminFestival(slug);

  // Zdroje pro kopii ročníku: jen festivaly, kde je uživatel organizátorem (správce platformy vidí všechny).
  const { data: memberships } = await db.from("festival_members").select("festival_id").eq("user_id", user.id);
  let query = db.from("festivals").select("slug, name, start_date").neq("id", program.festival.id).order("start_date", { ascending: false });
  if (!user.isPlatformAdmin) query = query.in("id", (memberships ?? []).map((m) => m.festival_id));
  const { data: others } = await query;

  return <ImportExport program={program} otherFestivals={(others ?? []).map((f) => ({ slug: f.slug, name: f.name }))} />;
}
