import { BrandingEditor } from "@/components/admin/BrandingEditor";
import { loadAdminFestival } from "@/lib/admin/data";

// Stránka čte data přihlášeného organizátora – smí počkat na server.
export const instant = false;

export default async function BrandingPage({ params }: PageProps<"/admin/[festival]/vzhled">) {
  const { festival: slug } = await params;
  const { program, isLead } = await loadAdminFestival(slug);
  return <BrandingEditor program={program} isLead={isLead} />;
}
