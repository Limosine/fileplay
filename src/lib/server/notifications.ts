import { PRIVATE_VAPID_KEY } from "$env/static/private";
import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { SHARING_TIMEOUT } from "$lib/common";
import type { Database } from "$lib/db";
import Peer from "peerjs";
import {
  generatePushHTTPRequest,
  ApplicationServerKeys,
} from "webpush-webcrypto";

/**
 * Sends a push notfications to a device with the given device ID.
 */
export async function sendNotification(
  db: Database,
  fetch: any,
  did: number,
  payload: string,
  topic?: string
) {
  const res1 = await db
    .selectFrom("devices")
    .select(["pushSubscription", "peerJsId"])
    .where("did", "=", did)
    .executeTakeFirst();

  if (!res1) throw new Error("Device not found");
  const { pushSubscription, peerJsId } = res1;

  if (pushSubscription) {
    // todo check if subscription is already expired

    const options = {
      applicationServerKeys: await ApplicationServerKeys.fromJSON({
        publicKey: PUBLIC_VAPID_KEY,
        privateKey: PRIVATE_VAPID_KEY,
      }),
      payload,
      target: JSON.parse(pushSubscription),
      adminContact: "mailto:web-push@fileplay.me",
      ttl: SHARING_TIMEOUT,
      urgency: "high",
    };

    if (topic) {
      // @ts-ignore sadly webpush-webcrypto doesn't have ts support
      options.topic = topic;
    }

    const { headers, body, endpoint } = await generatePushHTTPRequest(options);

    const res2 = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    if (!res2.ok) {
      throw new Error(
        `Failed to send request to push server: ${res2.statusText}`
      );
    }
  } else if (peerJsId) {
    
    
    await new Promise<void>((resolve, reject) => {
      const peer = new Peer();

      peer.on("error", (err) => { reject(err) });

      peer.on("open", (id) => {
        console.log(`opened as peerjs ${id}`)
        const conn = peer.connect(peerJsId);

        conn.on("error", (err) => { throw err });
        conn.on("open", () => {
          conn.send(payload)
          resolve()
        })
      })
    })
  } else
    throw new Error("Device has no subscription");
}
