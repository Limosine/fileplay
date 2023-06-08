/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { ONLINE_STATUS_REFRESH_TIME } from "$lib/common";
import { build, files, version } from "$service-worker";
declare let self: ServiceWorkerGlobalScope;

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
];

let keepaliveInterval: any;

async function registerPushSubscription() {
  if (keepaliveInterval) clearInterval(keepaliveInterval);
  if (Notification.permission !== "granted")
    throw new Error("No permission", { cause: "no permission" });
  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: PUBLIC_VAPID_KEY,
  });
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
  if (!res.ok)
    throw new Error("Failed to subscribe to push notifications", {
      cause: res.status,
    });

  keepaliveInterval = setInterval(async () => {
    await fetch("/api/push/keepalive");
  }, ONLINE_STATUS_REFRESH_TIME);

  console.log("Subscribed to push notifications");
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
  // ignore POST requests etc
  if (event.request.method !== "GET") return;

  async function respond() {
    const cache = await caches.open(CACHE);

    // `build`/`files` can always be served from the cache
    if (ASSETS.includes(url.pathname)) {
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
    }

    // for everything else, try the network first, but
    // fall back to the cache if we're offline
    try {
      const response = await fetch(event.request);

      if (response.status === 200) {
        cache.put(event.request, response.clone());
      }

      return response;
    } catch {
      const cached = await cache.match(event.request);
      if (!cached) throw new Error("No cached response");
      return cached;
    }
  }

  event.respondWith(respond());
});

self.addEventListener("install", (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
});

self.addEventListener("activate", (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
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
