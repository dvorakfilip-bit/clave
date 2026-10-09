import { RoomsStylesEditor } from "@/components/admin/RoomsStylesEditor";
import { loadAdminFestival } from "@/lib/admin/data";

export default async function RoomsPage({ params }: PageProps<"/admin/[festival]/mistnosti">) {
  const { festival: slug } = await params;
  const { program } = await loadAdminFestival(slug);
  return <RoomsStylesEditor program={program} />;
}
