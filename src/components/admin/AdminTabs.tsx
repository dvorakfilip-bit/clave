"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Nastavení" },
  { href: "/program", label: "Program" },
  { href: "/casy", label: "Časy" },
  { href: "/mistnosti", label: "Místnosti a styly" },
  { href: "/ucitele", label: "Učitelé" },
  { href: "/organizatori", label: "Organizátoři" },
  { href: "/info", label: "Informace" },
  { href: "/log", label: "Log změn" },
];

export function AdminTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
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
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
