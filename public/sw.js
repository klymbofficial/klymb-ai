/*
 * Klymb.ai service worker: offline reading and offline-safe pages.
 *
 *  - Build assets (/_next/static, fonts, icons) are cache-first: their names
 *    change with every deploy, so a cached copy is never stale.
 *  - Pages are network-first: always fresh online, the last copy offline,
 *    and /offline when a page was never visited.
 *  - Client-side navigation data (RSC) is never cached: offline it fails,
 *    and Next.js falls back to a full page load, which the cache serves.
 *  - Admin, APIs and sign-in are never cached.
 *  - Learner pages live in their own cache, cleared on sign-out.
 */
const VERSION = "v2"; // bump to replace cached pages and assets
const STATIC = `klymb-static-${VERSION}`;
const PAGES = `klymb-pages-${VERSION}`;
const LEARN = `klymb-learn-${VERSION}`;
const PRECACHE = ["/offline", "/", "/tracks", "/program", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("klymb-") && ![STATIC, PAGES, LEARN].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "clear-learner") event.waitUntil(caches.delete(LEARN));
});

const NEVER = /^\/(api|admin|auth)(\/|$)/;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || NEVER.test(url.pathname)) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Client-side navigation data: never cached, so Next falls back to a full load offline.
  if (req.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;

  if (req.mode === "navigate") event.respondWith(networkFirstPage(req, url));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(STATIC)).put(req, res.clone());
  return res;
}

async function networkFirstPage(req, url) {
  const cacheName = url.pathname.startsWith("/learn") ? LEARN : PAGES;
  try {
    const res = await fetch(req);
    // Never store a redirect (e.g. signed out → sign-in) as the page itself.
    if (res.ok && !res.redirected && res.type === "basic") (await caches.open(cacheName)).put(req, res.clone());
    return res;
  } catch {
    const hit = await caches.match(req, { ignoreVary: true, ignoreSearch: true });
    return hit || (await caches.match("/offline")) || Response.error();
  }
}

// Reminders: show the notification, and open (or focus) the right day when tapped.
self.addEventListener("push", (event) => {
  let msg = { title: "Klymb.ai", body: "Your next day is open.", url: "/learn" };
  try { msg = { ...msg, ...event.data.json() }; } catch { /* plain text or empty */ }
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png", // white K on transparent: Android draws badges as a silhouette
      tag: msg.tag,
      data: { url: msg.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/learn", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin));
      return open ? open.navigate(url).then((w) => w && w.focus()) : self.clients.openWindow(url);
    }),
  );
});
