self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
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
