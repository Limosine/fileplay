import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { get, writable } from "svelte/store";

import { apiClient } from "$lib/api/client";
import { env } from "$env/dynamic/public";

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
      vapidKey: env.PUBLIC_VAPID_KEY,
    });

    console.log("Firebase messaging token:", token);
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
    console.log(await FirebaseMessaging.getDeliveredNotifications());

    await FirebaseMessaging.addListener("notificationReceived", (event) => {
      console.log("notificationReceived", { event });
    });

    await FirebaseMessaging.addListener(
      "notificationActionPerformed",
      (event) => {
        console.log(
          "Push notification action performed",
          event.actionId,
          event.inputValue,
        );

        const data = event.notification.data as any;
        window.location.href = `/?accept-target&did=${data.did}&nid=${data.nid}`;
      },
    );
  }

  // Web
  private async initWeb(registration: ServiceWorkerRegistration) {
    if (Notification.permission == "denied")
      return localStorage.setItem("subscribedToPush", "false");
    else if (Notification.permission == "default") {
      const permission = await Notification.requestPermission();

      if (permission != "granted") return;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: env.PUBLIC_VAPID_KEY,
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
      localStorage.setItem("subscribedToPush", "false");
      console.log("Failed to subscribe to web-push.");
    }
  }
}
