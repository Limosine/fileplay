import { writable } from "svelte/store";

import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { apiClient } from "$lib/api/client";

class Notifications {
  initialized: boolean;

  constructor() {
    this.initialized = false;
  }

  async create(registration: ServiceWorkerRegistration) {
    if (!this.initialized) {
      await this.initWeb(registration);

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

export const notifications = writable(new Notifications());
