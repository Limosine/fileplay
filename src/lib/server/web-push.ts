import * as webpush from "web-push";

import { env } from "$env/dynamic/private";
import { get, writable } from "svelte/store";
import type { Database } from "$lib/lib/db";

const store = writable<WebPush>();

export const webPush = () => {
  let pushStore = get(store);
  if (pushStore === undefined) {
    pushStore = new WebPush();
    store.set(pushStore);
    return pushStore;
  } else {
    return pushStore;
  }
};

class WebPush {
  publicVapidKey: string;

  constructor() {
    if (env.PUBLIC_VAPID_KEY === undefined)
      throw new Error("Please define a public vapid key.");
    if (env.PRIVATE_VAPID_KEY === undefined)
      throw new Error("Please define a private vapid key.");
    if (env.GCM_KEY === undefined) throw new Error("Please define a gcm key.");

    this.publicVapidKey = env.PUBLIC_VAPID_KEY;

    webpush.setGCMAPIKey(env.GCM_KEY);
    webpush.setVapidDetails(
      "mailto:postmaster@wir-sind-frey.de",
      env.PUBLIC_VAPID_KEY,
      env.PRIVATE_VAPID_KEY,
    );
  }

  async sendMessage(db: Database, uid: number, message: string) {
    const devices = await db
      .selectFrom("devices")
      .select(["push_subscription"])
      .where("uid", "=", uid)
      .execute();

    for (const device of devices) {
      if (device.push_subscription !== null) {
        webpush.sendNotification(JSON.parse(device.push_subscription), message);
      }
    }
  }
}
