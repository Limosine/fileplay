/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import {
  pageCache,
  imageCache,
  staticResourceCache,
  googleFontsCache,
} from "workbox-recipes";

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

declare let self: ServiceWorkerGlobalScope;

let keepaliveInterval: any;

async function registerPushSubscription(): Promise<boolean> {
  if (keepaliveInterval) clearInterval(keepaliveInterval);
  if (Notification.permission !== "granted") return false;
  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: ">PUBLIC_VAPID_KEY<",
  });
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
  if (!res.ok) return false;

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
      case "skip_waiting":
        self.skipWaiting();
        break;
      // register push notifications (called after setup, otherwise already initialized)
      case "register_push":
        registerPushSubscription().then((success) => {
          if (success) console.log("registered subscription");
          else console.log("Failed to register push notifications");
        });
        break;
      default:
        console.log("Unknown message type", event.data.type);
    }
  }
});

async function deleteNotifications(tag: string) {
  await self.registration
    .getNotifications({ tag })
    .then((notifications) => {
      notifications.forEach((notification) => notification.close());
    });
}
// handle push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    // todo handle single notifications
    switch (data.type) {
      case "sharing_request":
        console.log("displaying sharing request notification");
        self.registration.showNotification("Sharing request", {
          actions: [
            {
              title: "Accept",
              action: "share_accept",
            },
            {
              title: "Reject",
              action: "share_reject",
            },
          ],
          data,
          body: `${data.sender} wants to share files with you. Click to accept.`,
          icon: "/favicon.png",
          tag: data.tag,
        });
        // TODO delete notification on timeout
        break;
      case "sharing_cancel":
        console.log("canceling own sharing notification");
        event.waitUntil(
          deleteNotifications(data.tag)
        );
      case "sharing_accept":
        console.log("got push other device accepted sharing request");
        // other user has accepted the sharing request
        break;
      case "sharing_reject":
        console.log("got push other device rejected sharing request");
        // other user has rejected the sharing request
        break;
      default:
        console.log("Unknown notification type", data.type);
    }
  }
});

// handle push notification clicks
self.addEventListener("notificationclick", async (event) => {
  console.log("Notification click", event);
  switch (event.action) {
    case "share_accept":
      console.log("Accepting sharing request...");
      await fetch("/api/share/answer", {
        method: "POST",
        body: JSON.stringify({
          sid: event.notification.data.sid,
          peerJsId: "akljsflaks",
          encryptionPublicKey: "aklsjflaksjflkajslkfj",
        }),
      });
      break;
    case "share_reject":
      console.log("Rejecting sharing request...");
      await fetch("/api/share/answer", {
        method: "DELETE",
        body: JSON.stringify({
          sid: event.notification.data.sid,
        }),
      });
      break;
    default:
      console.log("Unknown notification action", event.action);
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

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    // try to register push notifications
    registerPushSubscription().then((success) => {
      if (success) console.log("registered subscription");
      else console.log("Failed to register push notifications");
    })
  );
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
