/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
declare let self: ServiceWorkerGlobalScope;

let keepaliveInterval: any;

async function registerPushSubscription(): boolean {
  if (keepaliveInterval) clearInterval(keepaliveInterval);
  if (Notification.permission !== "granted")
    return false;
  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: ">PUBLIC_VAPID_KEY<",
  });
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
  if (!res.ok)
    return false

  keepaliveInterval = setInterval(async () => {
    await fetch("/api/push/keepalive");
  }, JSON.parse(">ONLINE_STATUS_REFRESH_TIME<"));

  console.log("Subscribed to push notifications");
  return true;
}

// handle messages from client
self.addEventListener("message", (event) => {
  if (event.data) {
    console.log("Message from client", event.data);
    switch (event.data.type) {
      // skip waiting to activate new service worker
      case "SKIP_WAITING":
        self.skipWaiting();
        break;
      // register push notifications (called after setup, otherwise already initialized)
      case "REGISTER_PUSH":
        registerPushSubscription().catch((err) => {
          console.error(err);
        });
      default:
        console.log("Unknown message type", event.data.type);
    }
  }
});

// handle push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log("Push notification", data);
    // todo handle single notifications
  }
});

// fetch handler
self.addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/webtarget") {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const files = formData.getAll("files") as File[];

        // TODO handle files for sending here
        // store files, redirect to contact selection dialog

        return Response.redirect("/", 303);
      })()
    );
  }
});

self.addEventListener("install", (event) => {
  precacheAndRoute(self.__WB_MANIFEST);
});

self.addEventListener("activate", (event) => {
  // Remove previous cached data from disk
  cleanupOutdatedCaches();
});

// try to register push notifications
registerPushSubscription().catch((err) => {
  console.error(err);
});

// TODO
// - handle web share target requests
// - handle file management
// - register push notifications                          DONE
// - send push notifications subscription to server       DONE
// - send keepalive requests to server                    DONE
// - handle push messages, show notifications
// - handle push notification clicks (accept, reject)
// - handle file sending
