import { JWT } from "google-auth-library";
import { get, writable } from "svelte/store";
import * as webpush from "web-push";

import { env } from "$env/dynamic/private";
import { env as envPublic } from "$env/dynamic/public";
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
    if (envPublic.PUBLIC_VAPID_KEY === undefined)
      throw new Error("Please define a public vapid key.");
    if (env.PRIVATE_VAPID_KEY === undefined)
      throw new Error("Please define a private vapid key.");
    if (env.GCM_KEY === undefined) throw new Error("Please define a gcm key.");

    this.publicVapidKey = envPublic.PUBLIC_VAPID_KEY;

    webpush.setGCMAPIKey(env.GCM_KEY);
    webpush.setVapidDetails(
      "mailto:postmaster@wir-sind-frey.de",
      envPublic.PUBLIC_VAPID_KEY,
      env.PRIVATE_VAPID_KEY,
    );
  }

  async getAccessToken() {
    const { default: key } = await import(
      "/etc/nixos/fileplay-me-firebase-adminsdk-ehpoc-8f5289af8c.json",
      { with: { type: "json" } }
    );
    const jwtClient = new JWT(
      key.client_email,
      undefined,
      key.private_key,
      "https://www.googleapis.com/auth/firebase.messaging",
    );
    return await new Promise<string | null | undefined>(function (
      resolve,
      reject,
    ) {
      jwtClient.authorize((err, tokens) => {
        if (err) return reject(err);
        else if (tokens === undefined) return reject();

        resolve(tokens.access_token);
      });
    });
  }

  async sendMessage(db: Database, uid: number, message: string) {
    const devices = await db
      .selectFrom("devices")
      .select(["push_subscription"])
      .where("uid", "=", uid)
      .execute();

    for (const device of devices) {
      if (device.push_subscription !== null) {
        const data = JSON.parse(device.push_subscription);
        if (typeof data === "string") {
          const user = await db
            .selectFrom("users")
            .select(["display_name", "avatar_seed"])
            .where("uid", "=", JSON.parse(message).uid)
            .executeTakeFirstOrThrow();

          await fetch(
            "https://fcm.googleapis.com/v1/projects/fileplay-me/messages:send",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + (await this.getAccessToken()),
              },
              body: JSON.stringify({
                message: {
                  token: data,
                  notification: {
                    title: "Sharing request",
                    body: `${user.display_name} wants to share files with you. Click to accept.`,
                  },
                },
              }),
            },
          );
        } else
          webpush.sendNotification(
            JSON.parse(device.push_subscription),
            message,
          );
      }
    }
  }
}
