import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type DeliveredNotifications,
} from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { get, writable } from "svelte/store";

import { apiClient } from "$lib/api/client";
import { env } from "$env/dynamic/public";

const store = writable<Notifications>();

export const notifications = (
  registration: ServiceWorkerRegistration,
  create: boolean,
) => {
  let notificationStore = get(store);
  if (notificationStore === undefined) {
    notificationStore = new Notifications(registration, create);
    store.set(notificationStore);
    return notificationStore;
  } else {
    return notificationStore;
  }
};

class Notifications {
  constructor(registration: ServiceWorkerRegistration, create: boolean) {
    if (create) {
      if (Capacitor.isNativePlatform()) {
        this.initNative();
      } else {
        this.initWeb(registration);
      }
    }
  }

  // Native
  private async initNative() {
    let localPerm = await LocalNotifications.checkPermissions();
    if (localPerm.display === "prompt") {
      localPerm = await LocalNotifications.requestPermissions();
    }

    let pushPerm = await PushNotifications.checkPermissions();
    if (pushPerm.receive === "prompt") {
      pushPerm = await PushNotifications.requestPermissions();
    }

    if (pushPerm.receive !== "granted" || localPerm.display !== "granted") {
      throw new Error("User denied permissions!");
    }

    await PushNotifications.register();
  }

  async initNativeListeners() {
    console.log(await PushNotifications.getDeliveredNotifications());

    await PushNotifications.addListener("registration", (token) => {
      apiClient("ws").sendMessage({
        type: "updateDevice",
        data: {
          update: {
            push_subscription: JSON.stringify(token.value),
          },
        },
      });
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.error("Registration error: ", err.error);
    });

    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Push notification received: ", notification);
      },
    );

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        console.log(
          "Push notification action performed",
          notification.actionId,
          notification.inputValue,
        );

        window.location.href = `/?accept-target&did=${notification.notification.data.did}&nid=${notification.notification.data.nid}`;
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
