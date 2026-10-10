/*
 * Clave – service worker pro offline režim (PRD 6.2).
 *
 * - Stránky (HTML): nejdřív síť, bez signálu uložená verze. Online tedy vždy čerstvý program.
 * - Statické soubory aplikace a obrázky: z paměti (mají v názvu otisk obsahu, nemění se).
 * - Data účastníka (Supabase) se tu neřeší – osobní výběr si aplikace ukládá sama.
 * - Stránka festivalu pošle zprávu „precache“ se seznamem adres, které se mají uložit dopředu.
 */

const VERSION = "v1";
const PAGES = `clave-pages-${VERSION}`;
const ASSETS = `clave-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

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
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") cache.put(request, response.clone());
    return response;
  } catch {
    return Response.error();
  }
}

// Uložení stránek festivalu dopředu (program, Můj program, učitelé, info, vybrané lekce).
self.addEventListener("message", (event) => {
  if (event.data?.type !== "precache" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(PAGES).then((cache) =>
      Promise.all(
        event.data.urls.map((path) =>
          fetch(path, { credentials: "same-origin" })
            .then((response) => (response.ok ? cache.put(path, response) : undefined))
            .catch(() => undefined),
        ),
      ),
    ),
  );
});
