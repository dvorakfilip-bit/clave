"use client";

import QRCode from "qrcode";
import { useMemo } from "react";
import { Button, Card } from "./ui";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clave.cz";

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
  const url = `${SITE_URL.replace(/\/$/, "")}/${slug}`;
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
    <Card title="QR kód festivalu">
      <div className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- vygenerovaný obrázek */}
        <img src={dataUrl} alt={`QR kód – ${name}`} width={160} height={160} className="rounded-lg border border-line" />
        <div className="space-y-2 text-sm">
          <p>
            Odkazuje na <span className="font-medium">{url}</span>
          </p>
          <p className="text-xs text-muted">Pro plakáty a stojánky. Před tiskem ho pro jistotu naskenuj mobilem.</p>
          <div className="flex gap-2">
            <Button onClick={downloadPng}>Stáhnout PNG</Button>
            <Button onClick={() => download(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), `${slug}-qr.svg`)}>Stáhnout SVG</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
