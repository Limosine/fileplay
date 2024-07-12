import { JWT } from "google-auth-library";
import {
  PushSubscription,
  VapidKeys,
  buildPushPayload,
} from "@block65/webcrypto-web-push";

import { Database } from "./kysely.ts";
import { filterOfflineDevices } from "./ws.ts";

let webPushValue: WebPush;
export const webPush = () => {
  if (webPushValue === undefined) webPushValue = new WebPush();
  return webPushValue;
};

class WebPush {
  keys: VapidKeys;
  private firebasePath: string;

  constructor() {
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    const publicVapidKey = Deno.env.get("PUBLIC_VAPID_KEY");
    const privateVapidKey = Deno.env.get("PRIVATE_VAPID_KEY");
    const gcmKey = Deno.env.get("GCM_KEY");
    const firebasePath = Deno.env.get("FIREBASE_PATH");

    const define = (s: string) => new Error(`Please define a ${s}.`);

    if (vapidSubject === undefined) throw define("vapid subject");
    if (publicVapidKey === undefined) throw define("public vapid key");
    if (privateVapidKey === undefined) throw define("private vapid key");
    if (gcmKey === undefined) throw define("gcm key");
    if (firebasePath === undefined) throw define("firebase path");

    this.firebasePath = firebasePath;

    this.keys = {
      subject: vapidSubject,
      publicKey: publicVapidKey,
      privateKey: privateVapidKey,
    };
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

    const devices = filterOfflineDevices(
      await db
        .selectFrom("devices")
        .select(["did", "push_subscription"])
        .where(to == "devices" ? "did" : "uid", "in", ids)
        .execute()
    );

    for (const device of devices) {
      if (device.push_subscription !== null) {
        const data: string | PushSubscription = JSON.parse(
          device.push_subscription
        );
        let res: Response;

        if (typeof data === "string") {
          res = await fetch(
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
          );
        } else {
          res = await fetch(
            data.endpoint,
            await buildPushPayload(
              {
                data: message,
                options: {
                  ttl: 60,
                  urgency: "high",
                },
              },
              data,
              this.keys
            )
          );
        }

        if (res.status !== 201) console.log(await res.text());
      }
    }
  }
}
