import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FestivalShell } from "@/components/festival/FestivalShell";
import { ProgramProvider } from "@/components/festival/ProgramContext";
import { fontFamily } from "@/lib/fonts";
import { getFestivalProgram } from "@/lib/program";
import { festivalThemeCss, styleCss } from "@/lib/theme";

async function Festival({ params, children }: { params: Promise<{ festival: string }>; children: React.ReactNode }) {
  const { festival: slug } = await params;
  const program = await getFestivalProgram(slug);
  if (!program) notFound();

  const css = festivalThemeCss(program.festival.colors, ".festival") + styleCss(program.styles);

  return (
    <div className="festival flex min-h-dvh flex-col bg-page text-ink" style={{ fontFamily: fontFamily(program.festival.font) }}>
      <style>{css}</style>
      <ProgramProvider program={program}>
        <FestivalShell>{children}</FestivalShell>
      </ProgramProvider>
    </div>
  );
}

export default function FestivalLayout({ params, children }: LayoutProps<"/[festival]">) {
  return (
    <Suspense fallback={<div className="p-6 text-muted">…</div>}>
      <Festival params={params}>{children}</Festival>
    </Suspense>
  );
}
