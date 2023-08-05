import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely, getDevices } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { DeviceType } from "$lib/lib/common";

export const GET: RequestHandler = async ({ cookies, platform }) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);
  if (!uid) throw error(401, "No user associated with this device");

  const devices = await getDevices(db, uid, did);

  if (devices.success) {
    return json(devices.response, { status: 200 });
  } else {
    return new Response(devices.response, { status: 500 });
  }
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
  const { did: own_did, uid } = await loadSignedDeviceID(cookies, key, db);

  const did_s = url.searchParams.get("did");
  let did: number;
  if (did_s) did = parseInt(did_s);
  else did = own_did;

  if (isNaN(did)) throw error(400, "Invalid device id in query params");

  const updateObject: {
    displayName?: string;
    type?: DeviceType;
    peerJsId?: string;
  } = await request.json();

  const res = await db
    .updateTable("devices")
    .set(updateObject)
    .where(({ and, or, cmpr }) =>
      and([
        cmpr("did", "=", did),
        or([cmpr("did", "=", own_did), cmpr("uid", "=", uid)]),
      ])
    )
    .returning("did")
    .executeTakeFirst();

  if (!res) throw error(500, "Failed to update device info");

  return new Response(null, { status: 200 });
};

export const DELETE: RequestHandler = async ({ platform, cookies, url }) => {
  // delete a device (requires cookie auth)
  // device id in query params
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did: own_did, uid } = await loadSignedDeviceID(cookies, key, db);

  const did_s = url.searchParams.get("did");
  let did: number;
  if (did_s) did = parseInt(did_s);
  else did = own_did;

  if (isNaN(did)) throw error(400, "Invalid device id in query params");

  // delete device mapping
  const res1 = await db
    .deleteFrom("devices")
    .where(({ and, or, cmpr }) =>
      and([
        cmpr("did", "=", did),
        or([cmpr("did", "=", own_did), cmpr("uid", "=", uid)]),
      ])
    )
    .returning("did")
    .executeTakeFirst();

  if (!res1) throw error(500, "Failed to delete device");

  // inform the device that it has been deleted via push

  return new Response(null, { status: 200 });
};
