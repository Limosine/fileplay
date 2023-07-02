/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { getDicebearUrl, ONLINE_STATUS_REFRESH_TIME } from "$lib/common";
import dayjs from "dayjs";
import {
  pageCache,
  imageCache,
  staticResourceCache,
  googleFontsCache,
} from "workbox-recipes";
import { get, set } from "idb-keyval";

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

declare let self: ServiceWorkerGlobalScope;

async function registerPushSubscription(): Promise<boolean> {
  const oldKeepaliveInterval = await get("keepaliveInterval");
  if (oldKeepaliveInterval) clearInterval(oldKeepaliveInterval);

  if (
    Notification.permission !== "granted" ||
    !("pushManager" in self.registration) ||
    !(await get("keepAliveCode"))
  )
    return false;
  try {
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: ">PUBLIC_VAPID_KEY<",
    });
    const postSubscription = async (subscription: PushSubscription) => {
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({ pushSubscription: subscription }),
      });
      if (!res.ok) {
        console.log("res is not ok");
        if (res.status === 401) {
          console.log("resetting client");
          await self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "reset_client",
              });
            });
          });
        }
        return false;
      }
      return true;
    };

    self.onpushsubscriptionchange = async (event) => {
      // update subscription on server
      const subscription = await self.registration.pushManager.subscribe(
        // @ts-ignore
        event.oldSubscription.options
      );
      const success = await postSubscription(subscription);
      console.log("received pushsubscriptionchange");
      if (!success) {
        console.log("reinitializing messages from sw");
        await self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "retry_messages_init",
            });
          });
        });
      }
    };

    await postSubscription(subscription);

    const keepalive = async () => {
      await fetch(`/api/keepalive?code=${await get("keepAliveCode")}`, {
        method: "GET",
      }).then(async (res) => {
        if (!res.ok) {
          console.log("res for keepalive is not ok");
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "set_status",
                status: "2",
              });
            });
          });
          if (res.status === 401) {
            console.log("resetting client");
            await self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: "reset_client",
                });
              });
            });
          }
        }
      });
    };
    // start keepalive
    await set(
      "keepaliveInterval",
      setInterval(keepalive, ONLINE_STATUS_REFRESH_TIME)
    );
    console.log("keepalive for push started");

    return true;
  } catch {
    return false;
  }
}

// handle messages from client
self.addEventListener("message", async (event) => {
  if (event.data) {
    console.log("Message from client", event.data);
    switch (event.data.type) {
      // skip waiting to activate new service worker
      case "skip_waiting":
        console.log("Trying to update service worker");
        self.skipWaiting();
        break;
      // register push notifications (called after setup, otherwise already initialized)
      case "register_push":
        const success = await registerPushSubscription()
          .then((value) => {
            console.log("Returned: ", value);
            return value;
          })
          .catch((error) => {
            console.log("Error: ", error);
            return false;
          })
          .finally(() => {
            console.log("Finally...");
          });
        console.log("Push registration success", success);
        event.source?.postMessage({
          class: "message",
          type: "push_registered",
          data: { success },
        });
        break;
      case "save_keep_alive_code":
        await set("keepAliveCode", event.data.keepAliveCode);
        break;
      case "send_share_details":
        await fetch("/api/share/answer", {
          method: "POST",
          body: JSON.stringify({
            peerJsId: event.data.peerJsId,
            encryptionPublicKey: event.data.encryptionPublicKey,
          }),
        });
        break;
      default:
        console.log("Unknown message type", event.data.type);
    }
  }
});

async function deleteNotifications(tag: string) {
  const notifications = await self.registration.getNotifications({ tag });
  console.log("Notifications listed: ", notifications);
  notifications.forEach((notification) => {
    console.log("Closing Notification: ", notification);
    notification.close();
  });
}

// handle push notifications
self.addEventListener("push", async (event) => {
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
          data: data.data,
          body: `${data.data.sender} wants to share files with you. Click to accept.`,
          icon: getDicebearUrl(data.data.avatarSeed, 192),
          tag: data.data.tag,
        });
        // delete notification on timeout
        setTimeout(async () => {
          await deleteNotifications(data.data.tag);
        }, dayjs.unix(data.data.expires).diff(dayjs(), "millisecond"));
        break;
      case "sharing_cancel":
        console.log("canceling own sharing notification");
        await deleteNotifications(data.data.tag);
        break;
      case "share_accepted":
        console.log("got push other device accepted sharing request");
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              class: "message",
              type: "share_accepted",
              data: data.data,
            });
          });
        });
        break;
      case "share_rejected":
        console.log("got push other device rejected sharing request");
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              class: "message",
              type: "share_rejected",
              data: data.data,
            });
          });
        });
        break;
      default:
        // maybe forward all other messages to client
        console.log("Unknown notification type", data.type);
    }
  }
});

// handle push notification clicks
self.addEventListener("notificationclick", async (event) => {
  switch (event.action) {
    case "share_accept":
    case "":
      console.log("Accepting sharing request...");
      await deleteNotifications(event.notification.data.tag);
      console.log("Delete Notifications...");
      // // pull client into focus or open window
      await self.clients.matchAll().then((clients) => {
        console.log("Promised clients: ", clients);
      });
      const unfilteredClients = await self.clients.matchAll({
        includeUncontrolled: true,
      });
      console.log("Unfiltered: ", unfilteredClients);
      const clients = (await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      })) as WindowClient[];
      console.log("Clients 1: ", clients);
      // prefer an already focused client, else the first one, else a new one
      let focusedclient;
      console.log("Looping through clients");

      for (const client of clients) {
        console.log("Going through client: ", client);
        if (client.focused) {
          focusedclient = client;
          break;
        }
      }
      let client: WindowClient | null = null;
      console.log("Client initiating");

      console.log("All clients: ", clients);
      if (focusedclient) client = focusedclient;
      else if (clients.length > 0) client = clients[0];
      else {
        client = await self.clients
          .openWindow("/")
          .then((client) => {
            return client;
          })
          .catch((reason) => {
            console.log("Client null: ", reason);
            return null;
          });
        console.log("client: ", client);
      }

      if (client) {
        //await client.navigate("/");
        console.log("Focusing window");
        // setTimeout(() => {
        console.log("Posting message");
        client?.postMessage({
          class: "notificationclick",
          type: "share_accept",
          data: event.notification.data,
        });
        // }, 1000);
      } else {
        console.log("no client to handle message click");
      }

      // if (client) {
      //   await client.navigate("/");
      //   try {
      //     await client.focus();
      //   } catch {}
      //   setTimeout(async () => {
      //     if (client) {
      //       client.postMessage({
      //         type: "return_share_details",
      //         sid: event.notification.data.sid,
      //       });
      //       console.log('sent message to client')
      //     }
      //     else console.log("client mysteriously disappeared");
      //   }, 1500);
      // }
      console.log("handled accept click");
      break;
    case "share_reject":
      // handle this without opening the app if possible
      console.log("Rejecting sharing request...");
      deleteNotifications(event.notification.data.tag).then(async () => {
        await fetch("/api/share/answer", {
          method: "DELETE",
          body: JSON.stringify({
            sid: event.notification.data.sid,
          }),
        });
      });
      break;
    default:
      console.log("Unknown notification action", event.action);
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  // self.clients.claim();
  // try to register push notifications
  registerPushSubscription().then((success) => {
    if (success) console.log("registered subscription");
    else console.log("Failed to register push notifications");
  });
});
