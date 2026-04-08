// Service Worker for Pain Tracker PWA

const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("offline-v1").then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Serve offline page for failed navigation requests
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// Handle push notifications
self.addEventListener("push", (event) => {
  let data = { title: "Pain Tracker", body: "Time to log your pain level", prompt: "" };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    data: { prompt: data.prompt },
    tag: "pain-tracker-" + data.prompt,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click - open the app with the right prompt
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const prompt = event.notification.data?.prompt || "";
  const url = prompt ? `/?prompt=${prompt}` : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
