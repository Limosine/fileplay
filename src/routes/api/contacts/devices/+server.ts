import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely, getDeviceInfos } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, platform }) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  if (!uid) throw error(401, "No user associated with this device");

  const devices = await getDeviceInfos(db, uid);

  if (devices.success) {
    return json(devices.response, { status: 200 });
  } else {
    return new Response(devices.response, { status: 500 });
  }
};
