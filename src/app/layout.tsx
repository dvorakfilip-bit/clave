import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Clave", template: "%s · Clave" },
  description: "Program tanečních festivalů v mobilu.",
  icons: { icon: "/clave-logo.svg" },
};

export const viewport: Viewport = {
  themeColor: "#C8102E",
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
