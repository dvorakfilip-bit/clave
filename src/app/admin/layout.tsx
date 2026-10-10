import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ClaveLogo } from "@/components/ClaveLogo";
import { requireUser } from "@/lib/auth";

// Správa vždy čte přihlášeného uživatele – nemá smysl ji předgenerovat.
export const instant = false;

async function UserBox() {
  const user = await requireUser();
  return (
    <span className="flex items-center gap-3 text-xs text-muted">
      <Link href="/pro-organizatory" className="underline">
        Návod
      </Link>
      <span className="hidden sm:inline">{user.name}</span>
      <SignOutButton />
    </span>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <ClaveLogo size={26} />
            Správa
          </Link>
          <Suspense fallback={null}>
            <UserBox />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        <Suspense fallback={<p className="text-sm text-muted">Načítám…</p>}>{children}</Suspense>
      </div>
    </div>
  );
}
