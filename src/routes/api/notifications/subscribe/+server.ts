import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "../../contacts/$types";

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did } = await loadSignedDeviceID(cookies, key, db);

  const { pushSubscription, websocketId } = await request.json() as any; // todo validation using ajv / joi

  if (pushSubscription) {
    const res = await db
      .updateTable("devices")
      .set({ pushSubscription: JSON.stringify(pushSubscription), websocketId: null })
      .where("did", "=", did)
      .returning("did")
      .executeTakeFirst();

    if (!res) throw error(500, "Failed to update push subscription");
  } else if (websocketId) {
    const res = await db
      .updateTable("devices")
      .set({ websocketId, pushSubscription: null })
      .where("did", "=", did)
      .returning("did")
      .executeTakeFirst();
    
    if (!res) throw error(500, "Failed to update peerjs id");
  } else
    throw error(400, "Missing push subscription or peerjs id");

  return new Response(null, { status: 204 });
};
