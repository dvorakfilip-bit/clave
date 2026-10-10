import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FestivalShell } from "@/components/festival/FestivalShell";
import { PersonalProvider } from "@/components/festival/PersonalContext";
import { ProgramProvider } from "@/components/festival/ProgramContext";
import { fontFamily } from "@/lib/font-list";
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
      {/* Barva lišty prohlížeče a aplikace na ploše (React ji přesune do <head>). */}
      <meta name="theme-color" content={program.festival.colors[0]} />
      <ProgramProvider program={program}>
        <PersonalProvider>
          <FestivalShell>{children}</FestivalShell>
        </PersonalProvider>
      </ProgramProvider>
    </div>
  );
}

export async function generateMetadata({ params }: LayoutProps<"/[festival]">): Promise<Metadata> {
  const { festival: slug } = await params;
  const program = await getFestivalProgram(slug);
  if (!program) return {};
  const f = program.festival;
  return {
    title: { default: f.name, template: `%s · ${f.name}` },
    description: f.descriptionCs ?? f.descriptionEn ?? undefined,
    manifest: `/${f.slug}/manifest.webmanifest`,
    icons: f.logoSquareUrl ? { icon: f.logoSquareUrl, apple: f.logoSquareUrl } : { icon: "/clave-logo.svg", apple: "/icon-180.png" },
    appleWebApp: { capable: true, title: f.name, statusBarStyle: "default" },
  };
}

export default function FestivalLayout({ params, children }: LayoutProps<"/[festival]">) {
  return (
    <Suspense fallback={<div className="p-6 text-muted">…</div>}>
      <Festival params={params}>{children}</Festival>
    </Suspense>
  );
}
