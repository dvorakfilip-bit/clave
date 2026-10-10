import Link from "next/link";
import { Suspense } from "react";
import { FestivalList } from "@/components/FestivalList";
import { ClaveLogo } from "@/components/ClaveLogo";
import { getPublicFestivals } from "@/lib/program";

async function Festivals() {
  const festivals = await getPublicFestivals();
  return <FestivalList festivals={festivals} />;
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <meta name="theme-color" content="#C8102E" />
      <div className="mb-8 flex items-center gap-3">
        <ClaveLogo size={44} />
        <span className="text-3xl font-semibold tracking-wide text-brand dark:text-ink">clave</span>
      </div>
      <Suspense fallback={null}>
        <Festivals />
      </Suspense>
      <footer className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-xs text-muted">
        <Link href="/o-aplikaci" className="underline">
          O aplikaci
        </Link>
        <Link href="/soukromi" className="underline">
          Ochrana osobních údajů
        </Link>
        <Link href="/pro-organizatory" className="underline">
          Pro organizátory
        </Link>
        <span className="w-full">Vytvořeno s pomocí AI (Claude od Anthropic).</span>
      </footer>
    </main>
  );
}
