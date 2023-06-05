import { createKysely } from "$lib/server/db";
import type { RequestHandler } from "../../contacts/$types";
import { notifyFileRequest } from "$lib/server/webpush";

export const POST: RequestHandler = async ({ platform, request }) => {
  const db = createKysely(platform);
  const { senderName, reciever_uuids } = await request.json();

  for (const uuid in reciever_uuids) {
    const promise = await db
      .selectFrom("devices")
      .where("devices.peerJsId", "==", uuid)
      .select("devices.pushSubscription")
      .executeTakeFirst();
    if (promise) {
      const deviceSubscription = promise.pushSubscription;
      if (deviceSubscription) {
        const res = notifyFileRequest(
          JSON.parse(deviceSubscription),
          JSON.stringify({
            title: "Öffne Fileplay!",
            body: `${senderName} versucht dir Datei(en) zu senden!`,
          })
        );

        return new Response((await res).body, {
          status: (await res).statusCode,
        });
      }
    }
  }

  return new Response(null, { status: 204 });
};
