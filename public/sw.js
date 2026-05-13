const SW_VERSION = "v3";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network-first for navigation (HTML) so installed PWAs always pull fresh shell.
// Cache-first for hashed /assets/* (immutable).
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(SW_VERSION);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cache = await caches.open(SW_VERSION);
        const cached = await cache.match(req) || await cache.match("/");
        if (cached) return cached;
        throw new Error("offline and no cache");
      }
    })());
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith((async () => {
      const cache = await caches.open(SW_VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    })());
  }
});

self.addEventListener("push", event => {
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    return;
  }

  if (!payload || !payload.title || !payload.body) {
    return;
  }

  const title = payload.title;
  const options = {
    body: payload.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag || "lazy-reminder",
    requireInteraction: payload.requireInteraction !== false,
    renotify: true,
    timestamp: Date.now(),
    actions: [
      { action: "open", title: "Open in Lazy" },
      { action: "dismiss", title: "Dismiss" },
    ],
    data: {
      url: payload.url || "/",
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(targetUrl);
      if ("focus" in client) return client.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
