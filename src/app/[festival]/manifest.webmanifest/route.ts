import { getFestivalProgram } from "@/lib/program";
import { festivalPalette } from "@/lib/theme";

/**
 * Manifest festivalu: po přidání na plochu se aplikace spustí rovnou na programu
 * festivalu, s jeho názvem, barvou a ikonou (PRD 6.1, 7.2).
 */
export async function GET(_req: Request, { params }: RouteContext<"/[festival]/manifest.webmanifest">) {
  const { festival: slug } = await params;
  const program = await getFestivalProgram(slug);
  if (!program) return new Response("Not found", { status: 404 });

  const f = program.festival;
  const { light } = festivalPalette(f.colors);
  const icons = f.logoSquareUrl
    ? [{ src: f.logoSquareUrl, sizes: "512x512", type: "image/webp", purpose: "any" }]
    : [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  const manifest = {
    id: `/${f.slug}`,
    name: f.name,
    short_name: f.name.length > 14 ? f.name.split(/\s+/).slice(0, 2).join(" ") : f.name,
    description: f.descriptionCs ?? f.descriptionEn ?? undefined,
    start_url: `/${f.slug}`,
    scope: `/${f.slug}`,
    display: "standalone",
    background_color: light["--page"],
    theme_color: light["--brand"],
    icons,
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
