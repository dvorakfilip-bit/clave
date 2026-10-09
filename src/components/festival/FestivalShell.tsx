"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, HeartIcon, MenuIcon, UsersIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { formatRange } from "@/lib/time";
import { useProgram } from "./ProgramContext";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[\p{L}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function FestivalShell({ children }: { children: React.ReactNode }) {
  const { program, base } = useProgram();
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const f = program.festival;

  const nav = [
    { href: base, label: t("program"), icon: <CalendarIcon />, active: pathname === base || pathname.startsWith(`${base}/lekce`) },
    { href: `${base}/muj-program`, label: t("myProgram"), icon: <HeartIcon />, active: pathname.startsWith(`${base}/muj-program`) },
    { href: `${base}/ucitele`, label: t("teachers"), icon: <UsersIcon />, active: pathname.startsWith(`${base}/ucitele`) },
    { href: `${base}/vice`, label: t("more"), icon: <MenuIcon />, active: pathname.startsWith(`${base}/vice`) },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-brand text-on-brand">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href={base} className="flex min-w-0 flex-1 items-center gap-3">
            {f.logoSquareUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo nahrává organizátor
              <img src={f.logoSquareUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-brand text-xs font-semibold text-brand">
                {initials(f.name)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight">{f.name}</span>
              <span className="block text-xs opacity-85">{formatRange(f.startDate, f.endDate, locale)}</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 pb-20">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-5xl grid-cols-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${item.active ? "text-brand dark:text-accent" : "text-muted"}`}
              aria-current={item.active ? "page" : undefined}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
