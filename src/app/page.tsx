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
      <div className="mb-8 flex items-center gap-3">
        <ClaveLogo size={44} />
        <span className="text-3xl font-semibold tracking-wide text-brand dark:text-ink">clave</span>
      </div>
      <Suspense fallback={null}>
        <Festivals />
      </Suspense>
    </main>
  );
}
