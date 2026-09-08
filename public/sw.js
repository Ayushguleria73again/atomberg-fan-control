const CACHE_NAME = "fancontrol-v1";
const STATIC_ASSETS = ["/", "/icon.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache or intercept API routes (always live network)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-first strategy for pages and static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful GET responses for static files
        if (
          event.request.method === "GET" &&
          response.status === 200 &&
          (url.pathname === "/" || url.pathname.startsWith("/_next/static/"))
        ) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
