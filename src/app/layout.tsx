import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Clave", template: "%s · Clave" },
  description: "Program tanečních festivalů v mobilu.",
  icons: { icon: "/clave-logo.svg", apple: "/icon-180.png" },
  appleWebApp: { capable: true, title: "Clave", statusBarStyle: "default" },
};

// Barvu lišty (theme-color) určuje každá stránka sama – festival podle své hlavní barvy.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
