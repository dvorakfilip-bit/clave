import { SlotsEditor } from "@/components/admin/SlotsEditor";
import { loadAdminFestival } from "@/lib/admin/data";

export default async function SlotsPage({ params }: PageProps<"/admin/[festival]/casy">) {
  const { festival: slug } = await params;
  const { program } = await loadAdminFestival(slug);
  return <SlotsEditor program={program} />;
}
