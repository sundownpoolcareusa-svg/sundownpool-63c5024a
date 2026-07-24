// Minimal service worker: only exists to receive Web Push events and show a
// notification for the technician's scheduled service reminders. No offline
// caching / asset interception — the app doesn't need that.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Sundown Pool Care", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Lembrete de serviço";
  const options = {
    body: data.body || "",
    icon: "/sundown-logo-white.png",
    badge: "/sundown-logo-white.png",
    data: { url: data.url || "/tecnico" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/tecnico";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url.includes("/tecnico") && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
