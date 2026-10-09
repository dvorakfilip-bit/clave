import { FestivalSettings } from "@/components/admin/FestivalSettings";
import { QrCard } from "@/components/admin/QrCard";
import { loadAdminFestival } from "@/lib/admin/data";

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

export default async function SettingsPage({ params }: PageProps<"/admin/[festival]">) {
  const { festival: slug } = await params;
  const { program, isLead } = await loadAdminFestival(slug);
  return (
    <div className="space-y-4">
      <FestivalSettings festival={program.festival} isLead={isLead} />
      <QrCard slug={program.festival.slug} name={program.festival.name} />
    </div>
  );
}
