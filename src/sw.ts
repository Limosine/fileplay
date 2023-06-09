/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { getDicebearUrl, ONLINE_STATUS_REFRESH_TIME } from "$lib/common";
import dayjs from "dayjs";
import Peer from "peerjs";
import {
  pageCache,
  imageCache,
  staticResourceCache,
  googleFontsCache,
} from "workbox-recipes";
import { generateKey } from "openpgp/lightweight";

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

declare let self: ServiceWorkerGlobalScope;

let keepaliveInterval: any;
let files: File[] = [];
const peer_config = {
  config: {
    iceServers: [
      { urls: "stun:a.relay.metered.ca:80" },
      {
        urls: "turn:a.relay.metered.ca:80",
        username: "cff5ad6e88d74c2223ea8d2a",
        credential: "Tf0V4fz9DEdbbAkf",
      },
      {
        urls: "turn:a.relay.metered.ca:80?transport=tcp",
        username: "cff5ad6e88d74c2223ea8d2a",
        credential: "Tf0V4fz9DEdbbAkf",
      },
      {
        urls: "turn:a.relay.metered.ca:443",
        username: "cff5ad6e88d74c2223ea8d2a",
        credential: "Tf0V4fz9DEdbbAkf",
      },
      {
        urls: "turn:a.relay.metered.ca:443?transport=tcp",
        username: "cff5ad6e88d74c2223ea8d2a",
        credential: "Tf0V4fz9DEdbbAkf",
      },
    ],
  },
};
const peer = new Peer();

let publicKey: string, privateKey: string;

peer.on("open", (id) => {
  console.log("peerjs open", id);
});

peer.on("connection", (conn) => {
  console.log("peerjs connection", conn);
  conn.on("data", (data) => {
    console.log("peerjs data", data);
  });
});

let websocket = createWebSocket();
function createWebSocket() {
  const websocket_variable = new WebSocket(
    "wss://dev.fileplay.pages.dev/websocket"
  );
  websocket.onmessage = (event) => {
    console.log(event.data);
  };
  websocket.onopen = (event) => {
    websocket.send("isOnline");
  };
  websocket.onclose = (event) => {
    console.log("WebSocket connection closed.");
    websocket = createWebSocket();
  };
  return websocket_variable;
}

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
  }, ONLINE_STATUS_REFRESH_TIME);

  console.log("Subscribed to push notifications");
  return true;
}

// handle messages from client
const broadcast = new BroadcastChannel("sw");
broadcast.addEventListener("message", async (event) => {
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
      case "load_files":
        const filesPromises = [];
        for (const fileHandle of event.data.handles as FileSystemFileHandle[]) {
          filesPromises.push(fileHandle.getFile());
        }
        files = await Promise.all(filesPromises);
        break;
      case "send_files":
        // TODO send request for sending files
        // sent from select_contacts
        break;
      case "cancel_send_files":
        // TODO send request for stopping sending files or cancel sending if in progress
        // sent from select_contacts
        break;
      default:
        console.log("Unknown message type", event.data.type);
    }
  }
});

async function deleteNotifications(tag: string) {
  await self.registration.getNotifications({ tag }).then((notifications) => {
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
          icon: getDicebearUrl(data.avatarSeed, 192),
          tag: data.tag,
        });
        // delete notification on timeout
        setTimeout(async () => {
          await deleteNotifications(data.tag);
        }, dayjs.unix(data.expires).diff(dayjs(), "millisecond"));
        break;
      case "sharing_cancel":
        console.log("canceling own sharing notification");
        event.waitUntil(deleteNotifications(data.tag));
        break;
      case "sharing_accept":
        console.log("got push other device accepted sharing request");
        // other user has accepted the sharing request
        // TODO work with the data and start sending files
        // display as accepted / currently sending
        const conn = peer.connect(data.peerJsId);
        conn.on("open", () => {
          conn.send("hi!");
          console.log("sent peerjs hi!");
        });
        break;
      case "sharing_reject":
        console.log("got push other device rejected sharing request");
        // other user has rejected the sharing request
        // display as unselected / rejected
        break;
      default:
        console.log("Unknown notification type", data.type);
    }
  }
});

// handle push notification clicks
self.addEventListener("notificationclick", async (event) => {
  switch (event.action) {
    case "share_accept":
      console.log("Accepting sharing request...");

      if (!publicKey) {
        await generateKey({
          type: "ecc",
          curve: "p384",
          userIDs: [{ name: "kjshdfkljsd" }], // what is this?
          format: "armored",
        }).then(({ publicKey: pubk, privateKey: pk }) => {
          publicKey = pubk;
          privateKey = pk;
          console.log("Generated key pair");
        });
      }

      await fetch("/api/share/answer", {
        method: "POST",
        body: JSON.stringify({
          sid: event.notification.data.sid,
          peerJsId: peer.id,
          encryptionPublicKey: publicKey,
        }),
      });
      console.log();

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
        files = formData.getAll("files") as File[];

        // TODO handle files for sending here
        // store files, redirect to contact selection dialog

        return Response.redirect("/?from=share", 303);
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
// - handle push messages, show notifications             DONE
// - handle push notification clicks (accept, reject)     DONE
// - handle file sending
// - after files are received, show a notification if app is closed or in app list -> open in web share api
// - show in app notifications
