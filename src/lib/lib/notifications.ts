import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { get, writable } from "svelte/store";

import { apiClient } from "$lib/api/client";
import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { awaitReady } from "$lib/sharing/send";

const store = writable<Notifications>();

export const notifications = () => {
  let notificationStore = get(store);
  if (notificationStore === undefined) {
    notificationStore = new Notifications();
    store.set(notificationStore);
    return notificationStore;
  } else {
    return notificationStore;
  }
};

class Notifications {
  initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  async create(registration: ServiceWorkerRegistration) {
    if (!this.initialized) {
      if (Capacitor.isNativePlatform()) {
        await this.initNative();
      } else {
        await this.initWeb(registration);
      }

      this.initialized = true;
    }
  }

  // Native
  private async initNative() {
    let localPerm = await LocalNotifications.checkPermissions();
    if (localPerm.display === "prompt") {
      localPerm = await LocalNotifications.requestPermissions();
    }

    let pushPerm = await FirebaseMessaging.checkPermissions();
    if (pushPerm.receive === "prompt") {
      pushPerm = await FirebaseMessaging.requestPermissions();
    }

    if (pushPerm.receive !== "granted" || localPerm.display !== "granted") {
      throw new Error("User denied permissions!");
    }

    const { token } = await FirebaseMessaging.getToken({
      vapidKey: PUBLIC_VAPID_KEY,
    });

    apiClient("ws").sendMessage({
      type: "updateDevice",
      data: {
        update: {
          push_subscription: JSON.stringify(token),
        },
      },
    });
  }

  async initNativeListeners() {
    await FirebaseMessaging.addListener(
      "notificationActionPerformed",
      (event) => {
        const data = event.notification.data as any;
        awaitReady(Number(data.did), data.nid);
      },
    );
  }

  // Web
  private async initWeb(registration: ServiceWorkerRegistration) {
    if (Notification.permission == "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission != "granted") return;

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: PUBLIC_VAPID_KEY,
      });

      localStorage.setItem("subscribedToPush", JSON.stringify(subscription));

      apiClient("ws").sendMessage({
        type: "updateDevice",
        data: {
          update: {
            push_subscription: JSON.stringify(subscription),
          },
        },
      });
    } catch (e: any) {
      console.log("Failed to subscribe to web-push.");
    }
  }
}
