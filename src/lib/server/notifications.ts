import { PRIVATE_VAPID_KEY } from "$env/static/private";
import { PUBLIC_VAPID_KEY } from "$env/static/public";
import { ONLINE_STATUS_TIMEOUT, SHARING_TIMEOUT } from "$lib/common";
import {
  generatePushHTTPRequest,
  ApplicationServerKeys,
} from "webpush-webcrypto";
import { createKysely } from "./db";
import dayjs from "dayjs";

/**
 * Sends a push notifications to a device with the given device ID.
 */
export async function sendNotification(
  platform: App.Platform,
  fetch: any,
  did: number,
  payload: string,
  topic?: string
) {
  if (!platform.env?.MESSAGE_WS) throw new Error("Message WS not configured");
  console.log("sending notification to", did);

  const db = createKysely(platform);
  const res1 = await db
    .selectFrom("devices")
    .select(["pushSubscription", "websocketId", "lastUsedConnection"])
    .where(({ and, cmpr }) =>
      and([
        cmpr("did", "=", did),
        cmpr(
          "lastSeenAt",
          ">",
          dayjs().subtract(ONLINE_STATUS_TIMEOUT, "ms").unix()
        ),
      ])
    )
    .executeTakeFirst();

  if (!res1) throw new Error("Device not found");
  const { pushSubscription, websocketId } = res1;

  if (res1.lastUsedConnection === "push" && pushSubscription) {
    // todo check if subscription is already expired

    const options = {
      applicationServerKeys: await ApplicationServerKeys.fromJSON({
        publicKey: PUBLIC_VAPID_KEY,
        privateKey: PRIVATE_VAPID_KEY,
      }),
      payload,
      target: JSON.parse(pushSubscription),
      adminContact: "mailto:web-push@fileplay.me",
      ttl: Math.ceil(SHARING_TIMEOUT / 1000), // this is in seconds instead of milliseconds
      urgency: "high",
    };

    if (topic) {
      // @ts-ignore sadly webpush-webcrypto doesn't have ts support
      options.topic = topic;
    }

    const { headers, body, endpoint } = await generatePushHTTPRequest(options);

    console.log("sending push notification to", endpoint);
    console.log("headers", headers);
    console.log("body", body);

    const res2 = (await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    })) as Response;

    if (!res2.ok) {
      console.log();
      throw new Error(
        `Failed to send request to push server: ${await res2.text()} (${
          res2.status
        } ${res2.statusText})`
      );
    }
  } else if (res1.lastUsedConnection === "websocket" && websocketId) {
    const id = platform.env.MESSAGE_WS.idFromString(websocketId);
    const stub = platform.env.MESSAGE_WS.get(id);
    const response = await stub.fetch("https://app.fileplay.me/websockets-do", {
      method: "POST",
      body: payload,
    });
    if (!response.ok)
      throw new Error(`Failed to send message: ${response.statusText}`);
  } else throw new Error("Device has no subscription");
}
