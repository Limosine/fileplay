import { get, writable } from "svelte/store";

import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { apiClient } from "$lib/api/client";

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

  async create(registration?: ServiceWorkerRegistration) {
    if (!this.initialized) {
      if (registration !== undefined) {
        await this.initWeb(registration);
      } else throw new Error("Web-Push: SW registration has to be defined.");

      this.initialized = true;
    }
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
      console.log("Failed to subscribe to web-push, reason:", e);
    }
  }
}
