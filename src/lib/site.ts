/**
 * Veřejná adresa aplikace (odkazy, QR kódy). Nastavuje se proměnnou NEXT_PUBLIC_SITE_URL;
 * na Vercelu jinak produkční adresa projektu, při vývoji localhost.
 */
const vercel = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");

/** Adresa bez protokolu pro zobrazení, např. „clave-gilt.vercel.app“. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
