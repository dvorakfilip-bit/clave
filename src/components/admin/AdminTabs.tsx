"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const TABS = [
  { href: "", cs: "Nastavení", en: "Settings" },
  { href: "/vzhled", cs: "Vzhled", en: "Appearance" },
  { href: "/program", cs: "Program", en: "Program" },
  { href: "/casy", cs: "Časy", en: "Time slots" },
  { href: "/mistnosti", cs: "Místnosti a styly", en: "Rooms and styles" },
  { href: "/ucitele", cs: "Učitelé", en: "Teachers" },
  { href: "/organizatori", cs: "Organizátoři", en: "Organizers" },
  { href: "/info", cs: "Informace", en: "Info" },
  { href: "/import", cs: "Import a export", en: "Import and export" },
  { href: "/log", cs: "Log změn", en: "Change log" },
];

export function AdminTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const { tr } = useI18n();
  const base = `/admin/${slug}`;
  return (
    <nav className="-mx-4 overflow-x-auto border-b border-line px-4">
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const href = base + tab.href;
          const active = tab.href ? pathname.startsWith(href) : pathname === base;
          return (
            <Link
              key={tab.href}
              href={href}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm ${active ? "border-brand font-semibold" : "border-transparent text-muted"}`}
            >
              {tr(tab.cs, tab.en)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
