"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { useI18n } from "@/lib/i18n";

export function SignOutButton() {
  const router = useRouter();
  const { tr } = useI18n();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/");
      }}
      className="rounded-lg border border-line px-2.5 py-1"
    >
      {tr("Odhlásit", "Sign out")}
    </button>
  );
}
