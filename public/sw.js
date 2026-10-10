/*
 * Clave – service worker pro offline režim (PRD 6.2).
 *
 * - Stránky (HTML): nejdřív síť, bez signálu uložená verze. Online tedy vždy čerstvý program.
 * - Statické soubory aplikace a obrázky: z paměti (mají v názvu otisk obsahu, nemění se).
 *   Paměť souborů má strop – nejstarší soubory (z minulých verzí aplikace) se mažou.
 * - Data účastníka (Supabase) se tu neřeší – osobní výběr si aplikace ukládá sama.
 * - Stránka festivalu pošle zprávu „precache“ se seznamem adres, které se mají uložit dopředu;
 *   uloží se i skripty a styly, které tyto stránky potřebují.
 */

const VERSION = "v2";
const PAGES = `clave-pages-${VERSION}`;
const ASSETS = `clave-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const MAX_ASSETS = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  /\.(?:png|svg|webp|jpg|jpeg|woff2?)$/.test(url.pathname) ||
  url.pathname.includes("/storage/v1/object/public/");

// Stránky, které se nemají ukládat (správa, přihlášení, API).
const isPrivate = (url) => /^\/(admin|ucet|prihlaseni|auth|api)(\/|$)/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    if (url.origin !== self.location.origin || isPrivate(url)) return;
    event.respondWith(networkFirst(request));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  const key = new URL(request.url).pathname;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch {
    return (await cache.match(key)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    // Obrázky z úložiště jsou z jiné domény – stahují se s CORS, aby šlo poznat chybu
    // (neprůhlednou odpověď by šlo uložit i rozbitou, a už navždy).
    const crossOrigin = new URL(request.url).origin !== self.location.origin;
    const response = crossOrigin
      ? await fetch(request.url, { mode: "cors", credentials: "omit" }).catch(() => fetch(request))
      : await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      trimAssets(cache);
    }
    return response;
  } catch {
    return Response.error();
  }
}

/** Udrží paměť souborů pod stropem – klíče jsou v pořadí uložení, nejstarší jdou pryč. */
async function trimAssets(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ASSETS)).map((k) => cache.delete(k)));
}

/** Skripty a styly aplikace odkazované ze stránky (bez nich by uložená stránka offline nefungovala). */
function assetsOf(html) {
  return [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
}

// Uložení stránek festivalu dopředu (program, Můj program, učitelé, info, vybrané lekce).
self.addEventListener("message", (event) => {
  if (event.data?.type !== "precache" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES);
      const assets = await caches.open(ASSETS);
      const needed = new Set();
      await Promise.all(
        event.data.urls.map(async (path) => {
          try {
            const response = await fetch(path, { credentials: "same-origin" });
            if (!response.ok) return;
            for (const asset of assetsOf(await response.clone().text())) needed.add(asset);
            await pages.put(path, response);
          } catch {}
        }),
      );
      for (const asset of needed) {
        if (await assets.match(asset)) continue;
        try {
          const response = await fetch(asset);
          if (response.ok) await assets.put(asset, response);
        } catch {}
      }
      await trimAssets(assets);
    })(),
  );
});
