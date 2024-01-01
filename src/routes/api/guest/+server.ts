import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url }) => {
  const db = createKysely(platform);
  const did = Number(url.searchParams.get("did"));

  const webRTCOffer = await db
    .selectFrom("devices")
    .select(["devices.webRTCOffer"])
    .where("devices.did", "=", did)
    .executeTakeFirst();

  if (!webRTCOffer || webRTCOffer.webRTCOffer == null) {
    error(400, "No such device or no WebRTC-Offer available");
  }

  return json(webRTCOffer.webRTCOffer);
};
