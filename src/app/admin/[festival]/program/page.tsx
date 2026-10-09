import { ProgramEditor } from "@/components/admin/ProgramEditor";
import { loadAdminFestival } from "@/lib/admin/data";

export default async function ProgramAdminPage({ params }: PageProps<"/admin/[festival]/program">) {
  const { festival: slug } = await params;
  const { program } = await loadAdminFestival(slug);
  return <ProgramEditor program={program} />;
}
