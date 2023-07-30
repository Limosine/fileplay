import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url }) => {
  const db = createKysely(platform);
  const did = Number(url.searchParams.get("did"));

  const peerJsId = await db
    .selectFrom("devices")
    .select([
      "devices.peerJsId"
    ])
    .where("devices.did", "=", did)
    .executeTakeFirst();

  if (!peerJsId || peerJsId.peerJsId == null ) {
    throw error(400, "No such device or no peerJsId available");
  }

  return json(peerJsId.peerJsId);
};