"use client";

import QRCode from "qrcode";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { Button, Card } from "./ui";

/**
 * QR kód festivalu s logem Clave uprostřed (PRD 7.6): oprava chyb H,
 * logo na bílém poli zabírá ~30 % šířky kódu.
 */
function qrSvg(url: string) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const quiet = 4;
  const total = n + quiet * 2;
  const hole = Math.round(n * 0.3) | 1; // lichý počet modulů, aby bylo pole uprostřed
  const from = (n - hole) / 2;
  const to = from + hole;

  let rects = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (r >= from && r < to && c >= from && c < to) continue;
      if (qr.modules.get(r, c)) rects += `<rect x="${c + quiet}" y="${r + quiet}" width="1.02" height="1.02"/>`;
    }
  }
  const x = from + quiet;
  const logo = hole * 0.8;
  const lx = x + (hole - logo) / 2;
  const s = logo / 100;
  const dots = [16, 32, 56, 71, 86].map((cx) => `<circle cx="${cx}" cy="50" r="5" fill="#FFFFFF"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">
<rect width="${total}" height="${total}" fill="#FFFFFF"/>
<g fill="#1B1B1B">${rects}</g>
<rect x="${x}" y="${x}" width="${hole}" height="${hole}" rx="${hole * 0.18}" fill="#FFFFFF"/>
<g transform="translate(${lx} ${lx}) scale(${s})" shape-rendering="geometricPrecision"><rect width="100" height="100" rx="22" fill="#C8102E"/>${dots}</g>
</svg>`;
}

function download(href: string, fileName: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  a.click();
}

export function QrCard({ slug, name }: { slug: string; name: string }) {
  const { tr } = useI18n();
  const url = `${SITE_URL}/${slug}`;
  const svg = useMemo(() => qrSvg(url), [url]);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  function downloadPng() {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 2048;
      canvas.getContext("2d")!.drawImage(img, 0, 0, 2048, 2048);
      download(canvas.toDataURL("image/png"), `${slug}-qr.png`);
    };
    img.src = dataUrl;
  }

  return (
    <Card title={tr("QR kód festivalu", "Festival QR code")}>
      <div className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- vygenerovaný obrázek */}
        <img src={dataUrl} alt={`${tr("QR kód", "QR code")} – ${name}`} width={160} height={160} className="rounded-lg border border-line" />
        <div className="space-y-2 text-sm">
          <p>
            {tr("Odkazuje na", "Links to")} <span className="font-medium">{url}</span>
          </p>
          <p className="text-xs text-muted">{tr("Pro plakáty a stojánky. Před tiskem ho pro jistotu naskenuj mobilem.", "For posters and table stands. Scan it with your phone before printing to be sure.")}</p>
          <div className="flex gap-2">
            <Button onClick={downloadPng}>{tr("Stáhnout PNG", "Download PNG")}</Button>
            <Button onClick={() => download(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), `${slug}-qr.svg`)}>{tr("Stáhnout SVG", "Download SVG")}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
