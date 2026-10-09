import { Suspense } from "react";
import { ClaveLogo } from "@/components/ClaveLogo";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Přihlášení" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center justify-center gap-3">
        <ClaveLogo size={40} />
        <span className="text-2xl font-semibold tracking-wide">clave</span>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
