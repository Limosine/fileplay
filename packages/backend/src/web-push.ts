import { JWT } from "google-auth-library";

// @deno-types="npm:@types/web-push"
import * as webpush from "web-push";

import { Database } from "./kysely.ts";

let webPushValue: WebPush;
export const webPush = () => {
  if (webPushValue === undefined) webPushValue = new WebPush();
  return webPushValue;
};

class WebPush {
  publicVapidKey: string;
  private firebasePath: string;

  constructor() {
    const publicVapidKey = Deno.env.get("PUBLIC_VAPID_KEY");
    const privateVapidKey = Deno.env.get("PRIVATE_VAPID_KEY");
    const gcmKey = Deno.env.get("GCM_KEY");
    const firebasePath = Deno.env.get("FIREBASE_PATH");

    const define = (s: string) => new Error(`Please define a ${s}.`);

    if (publicVapidKey === undefined) throw define("public vapid key");
    if (privateVapidKey === undefined) throw define("private vapid key");
    if (gcmKey === undefined) throw define("gcm key");
    if (firebasePath === undefined) throw define("firebase path");

    this.publicVapidKey = publicVapidKey;
    this.firebasePath = firebasePath;

    webpush.setGCMAPIKey(gcmKey);
    webpush.setVapidDetails(
      "mailto:postmaster@wir-sind-frey.de",
      publicVapidKey,
      privateVapidKey
    );
  }

  async getAccessToken() {
    const key = JSON.parse(Deno.readTextFileSync(this.firebasePath));
    const jwtClient = new JWT(
      key.client_email,
      undefined,
      key.private_key,
      "https://www.googleapis.com/auth/firebase.messaging"
    );
    return await new Promise<string | null | undefined>((resolve, reject) => {
      jwtClient.authorize((err, tokens) => {
        if (err) return reject(err);
        else if (tokens === undefined) return reject();

        resolve(tokens.access_token);
      });
    });
  }

  async sendMessage(
    db: Database,
    to: "devices" | "users",
    ids: number[],
    message: {
      username: string;
      avatarSeed: string;
      did: number;
      nid: string;
      files: string[];
    }
  ) {
    if (ids.length < 1) return;

    const devices = await db
      .selectFrom("devices")
      .select(["push_subscription"])
      .where(to == "devices" ? "did" : "uid", "in", ids)
      .execute();

    for (const device of devices) {
      if (device.push_subscription !== null) {
        const data = JSON.parse(device.push_subscription);
        if (typeof data === "string") {
          console.log(
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
                      body: `${message.username} wants to share the file${
                        message.files.length > 1 ? "s" : ""
                      } '${message.files.toString()}' with you. Click to accept.`,
                    },
                    data: {
                      did: message.did.toString(),
                      nid: message.nid,
                    },
                    android: {
                      ttl: "900s",
                      priority: "high",
                    },
                  },
                }),
              }
            )
          );
        } else
          console.log(
            await webpush.sendNotification(data, JSON.stringify(message))
          );
      }
    }
  }
}
