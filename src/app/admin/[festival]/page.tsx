import { FestivalSettings } from "@/components/admin/FestivalSettings";
import { loadAdminFestival } from "@/lib/admin/data";

export default async function SettingsPage({ params }: PageProps<"/admin/[festival]">) {
  const { festival: slug } = await params;
  const { program } = await loadAdminFestival(slug);
  return <FestivalSettings festival={program.festival} />;
}
