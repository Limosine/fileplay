import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (request) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(request.platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(request.cookies, key);

  const devices = await db
    .selectFrom("devices")
    .selectAll()
    .where(
      "id",
      "in",
      db
        .selectFrom("devicesToUsers")
        .select("did")
        .where(
          "uid",
          "=",
          db
            .selectFrom("devicesToUsers")
            .select("uid")
            .where("did", "=", did)
        )
    )
    .execute();
  
  return json(devices, {status: 200});
};

export const POST: RequestHandler = async ({
  platform,
  cookies,
  request,
  url,
}) => {
  // change device info (requires cookie auth)
  // device id in query params
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const own_did = await loadSignedDeviceID(cookies, key);

  const did_s = url.searchParams.get("did");
  if (!did_s) throw error(400, "Missing device id in query params");
  const did = parseInt(did_s);
  if (isNaN(did)) throw error(400, "Invalid device id in query params");

  const { displayName, type } = await request.json();
  let updateObject: {displayName?: string, type?: string} = {};
  if (displayName) updateObject["displayName"] = displayName;
  if (type) updateObject["type"] = type;


  const res = await db
    .updateTable("devices")
    .set(updateObject as any)
    .where("id", "=", did)
    .where(
      "id",
      "in",
      db
        .selectFrom("devicesToUsers")
        .select("did")
        .where(
          "uid",
          "=",
          db
            .selectFrom("devicesToUsers")
            .select("uid")
            .where("did", "=", own_did)
        )
    )
    .executeTakeFirst();

  if (!res) throw error(403, "You do not own this device");

  return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async ({ platform, cookies, url }) => {
  // delete a device (requires cookie auth)
  // device id in query params
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const own_did = await loadSignedDeviceID(cookies, key);

  const did_s = url.searchParams.get("did");
  if (!did_s) throw error(400, "Missing device id in query params");
  const did = parseInt(did_s);
  if (isNaN(did)) throw error(400, "Invalid device id in query params");

  if (did == own_did) {
    await db
      .deleteFrom("devices")
      .where("id", "=", did)
      .executeTakeFirstOrThrow();
  } else {
    // delete deviceToUser mapping
    const res1 = await db
      .deleteFrom("devicesToUsers")
      .where("did", "=", did)
      .where(
        "uid",
        "=",
        db.selectFrom("devicesToUsers").select("uid").where("did", "=", own_did)
      )
      .executeTakeFirst();
    if (!res1) throw error(403, "You do not own this device");

    // delete device
    await db
      .deleteFrom("devices")
      .where("id", "=", did)
      .executeTakeFirstOrThrow();
  }

  return new Response("", { status: 204 });
};
