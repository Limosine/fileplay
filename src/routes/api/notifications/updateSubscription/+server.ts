import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "../../contacts/$types";
import webpush from "web-push";

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did } = await loadSignedDeviceID(cookies, key, db);

  const subscriptionUpdateObject = await request.json(); // todo validation using ajv / joi

  webpush.setVapidDetails(
    "https://app.fileplay.me",
    import.meta.env.PUBLIC_VAPID_KEY,
    import.meta.env.PRIVATE_VAPID_KEY
  );

  const res = await db
    .updateTable("devices")
    .set({ pushSubscription: JSON.stringify(subscriptionUpdateObject) })
    .where("did", "=", did)
    .returning("did")
    .executeTakeFirst();

  if (!res) throw error(500, "Failed to update push subscription");

  return new Response(null, { status: 204 });
};
