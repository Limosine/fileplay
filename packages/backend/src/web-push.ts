import { JWT } from "google-auth-library";
import {
  type PushSubscription,
  type VapidKeys,
  buildPushPayload,
} from "@block65/webcrypto-web-push";
import { z } from "zod";

import { Database } from "./kysely.ts";
import { filterOfflineDevices } from "./ws.ts";

let webPushValue: WebPush;
export const webPush = () => {
  if (webPushValue === undefined) webPushValue = new WebPush();
  return webPushValue;
};

const env = z.object({
  VAPID_SUBJECT: z.string(),
  PUBLIC_VAPID_KEY: z.string(),
  PRIVATE_VAPID_KEY: z.string(),
  GCM_KEY: z.string(),
  FIREBASE_PATH: z.string(),
});

class WebPush {
  private e: z.infer<typeof env>;
  private keys: VapidKeys;

  constructor() {
    this.e = env.parse(Deno.env.toObject());

    this.keys = {
      subject: this.e.VAPID_SUBJECT,
      publicKey: this.e.PUBLIC_VAPID_KEY,
      privateKey: this.e.PRIVATE_VAPID_KEY,
    };
  }

  async getAccessToken() {
    const key = JSON.parse(Deno.readTextFileSync(this.e.FIREBASE_PATH));
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
