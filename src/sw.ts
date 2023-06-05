/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

// handle prompt update
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// clean old assets
cleanupOutdatedCaches();

// web share target POSTs to /handle
self.addEventListener("fetch", async (event) => {
  if (event.request.method === "POST") {
    const url = new URL(event.request.url);
    if (url.pathname === "/handle") {
      event.respondWith(
        (async () => {
          const formData = await event.request.formData();
          const files = formData.getAll("files") as File[];

          // TODO handle files for sending here

          return Response.redirect("/", 303);
        })()
      );
    }
  }
});

self.addEventListener("push", e => {
  const data = e.data?.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    // icon: "http://image.ibb.co/frYOFd/tmlogo.png"
  });
});
