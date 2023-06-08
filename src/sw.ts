/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
const sw = self as unknown as ServiceWorkerGlobalScope;

import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { ONLINE_STATUS_REFRESH_TIME } from "$lib/common";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";


let keepaliveInterval: any

async function registerPushSubscription() {
  if(keepaliveInterval) clearInterval(keepaliveInterval)
  if (Notification.permission !== "granted")
    throw new Error("No permission", { cause: "no permission" });
  const subscription = await sw.registration.pushManager.subscribe({
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
    await fetch("/api/push/keepalive")
  }, ONLINE_STATUS_REFRESH_TIME)

  console.log("Subscribed to push notifications");
}

// handle messages from client
sw.addEventListener("message", (event) => {
  if (event.data) {
    console.log("Message from client", event.data)
    switch (event.data.type) {
      // skip waiting to activate new service worker
      case "SKIP_WAITING":
        sw.skipWaiting();
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
sw.addEventListener("push", (event) => {
  if(event.data) {
    const data = event.data.json()
    console.log("Push notification", data)
    // todo handle single notifications
  }
});

// web share target handler
sw.addEventListener("fetch", async (event) => {
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

// precache all assets
precacheAndRoute(sw.__WB_MANIFEST);
// clean old assets
cleanupOutdatedCaches();

// setup push notifications
await registerPushSubscription().catch((err) => {
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
