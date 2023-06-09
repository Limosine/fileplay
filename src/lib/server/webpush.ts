import { PRIVATE_VAPID_KEY } from "$env/static/private";
import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { SHARING_TIMEOUT } from "$lib/common";
import type { Database } from "$lib/db";
import {
  generatePushHTTPRequest,
  ApplicationServerKeys,
} from "webpush-webcrypto";

/**
 * Sends a push notfications to a device with the given device ID.
 */
export async function sendPushNotification(
  db: Database,
  fetch: any,
  did: number,
  payload: string,
  topic?: string
) {
  const res1 = await db
    .selectFrom("devices")
    .select("pushSubscription")
    .where("did", "=", did)
    .executeTakeFirst();

  if (!res1) throw new Error("Device not found");
  if (!res1.pushSubscription)
    throw new Error("Device has no push subscription");

  const subscription = res1.pushSubscription;

  if (!subscription) return;
  // todo check if subscription is already expired

  const options = {
    applicationServerKeys: await ApplicationServerKeys.fromJSON({
      publicKey: PUBLIC_VAPID_KEY,
      privateKey: PRIVATE_VAPID_KEY,
    }),
    payload,
    target: JSON.parse(subscription),
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
}
