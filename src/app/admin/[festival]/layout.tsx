import Link from "next/link";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { loadAdminFestival } from "@/lib/admin/data";
import { SITE_HOST } from "@/lib/site";

// Hlavička festivalu čte data přihlášeného organizátora – vstup do správy smí počkat na server.
export const instant = false;

const STATUS = { draft: "Koncept", published: "Zveřejněno", archived: "Archiv" } as const;

export default async function FestivalAdminLayout({ params, children }: LayoutProps<"/admin/[festival]">) {
  const { festival: slug } = await params;
  const { program } = await loadAdminFestival(slug);
  const f = program.festival;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{f.name}</h1>
          <p className="text-xs text-muted">
            {STATUS[f.status]} ·{" "}
            <Link href={`/${f.slug}`} className="underline" target="_blank">
              {SITE_HOST}/{f.slug}
            </Link>
          </p>
        </div>
      </div>
      <AdminTabs slug={slug} />
      {children}
    </div>
  );
}
