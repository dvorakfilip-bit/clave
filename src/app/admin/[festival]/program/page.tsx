import { ProgramEditor } from "@/components/admin/ProgramEditor";
import { loadAdminFestival } from "@/lib/admin/data";

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

export default async function ProgramAdminPage({ params }: PageProps<"/admin/[festival]/program">) {
  const { festival: slug } = await params;
  const { program } = await loadAdminFestival(slug);
  return <ProgramEditor program={program} />;
}
