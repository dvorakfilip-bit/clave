import { InfoPagesEditor } from "@/components/admin/InfoPagesEditor";
import { loadAdminFestival } from "@/lib/admin/data";

export default async function InfoAdminPage({ params }: PageProps<"/admin/[festival]/info">) {
  const { festival: slug } = await params;
  const { program } = await loadAdminFestival(slug);
  return <InfoPagesEditor slug={slug} pages={program.infoPages} />;
}
