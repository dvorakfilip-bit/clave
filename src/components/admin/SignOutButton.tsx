"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/admin/actions";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/");
      }}
      className="rounded-lg border border-line px-2.5 py-1"
    >
      Odhlásit
    </button>
  );
}
