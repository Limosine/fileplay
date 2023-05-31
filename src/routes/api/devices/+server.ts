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
    .innerJoin("devicesToUsers", "devices.did", "devicesToUsers.did")
    .select([
      "devices.did",
      "devices.type",
      "devices.displayName",
      "devices.isOnline",
      "devices.createdAt",
      "devices.lastSeenAt",
      "devicesToUsers.createdAt as linkedAt",
    ])
    .where(
      "devicesToUsers.uid",
      "=",
      db.selectFrom("devicesToUsers").select("uid").where("did", "=", did)
    )
    .orderBy("displayName")
    .execute();

  return json(devices, { status: 200 });
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
  let did: number;
  if (did_s) did = parseInt(did_s);
  else did = own_did;

  if (isNaN(did)) throw error(400, "Invalid device id in query params");

  const updateObject = await request.json(); // todo validation using ajv / joi

  const res = await db
    .updateTable("devices")
    .set(updateObject)
    .where("did", "=", did)
    .where(
      "did",
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
  let did: number;
  if (did_s) did = parseInt(did_s);
  else did = own_did;

  if (isNaN(did)) throw error(400, "Invalid device id in query params");

  if (did == own_did) {
    // get uid
    const { uid } = await db
      .selectFrom("devicesToUsers")
      .select("uid")
      .where("did", "=", own_did)
      .executeTakeFirstOrThrow();

    // delete deviceToUser mapping
    const res1 = await db
      .deleteFrom("devicesToUsers")
      .where("did", "=", did)
      .where("uid", "=", uid)
      .executeTakeFirst();
    if (!res1) throw error(403, "You do not own this device");

    await db
      .deleteFrom("devices")
      .where("did", "=", did)
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
      .where("did", "=", did)
      .executeTakeFirstOrThrow();
  }

  return new Response("", { status: 204 });
};
