import type { MetadataRoute } from "next";

/** Manifest platformy Clave (instalace hlavní stránky na plochu). Festivaly mají vlastní manifest. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clave",
    short_name: "Clave",
    description: "Program tanečních festivalů v mobilu.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F6F3",
    theme_color: "#C8102E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
