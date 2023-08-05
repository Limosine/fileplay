import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely, getContacts, getDeviceInfos, getDevices, getUser } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid, did} = await loadSignedDeviceID(cookies, key, db);
  if (!uid) throw error(401, "No user associated with this device");

  const requested = url.searchParams.get("request")?.split(",");

  let result = {};

  let temporary_value;

  requested?.forEach(async (request) => {
    switch (request) {
    case "user":
      temporary_value = await getUser(db, uid);

      if (temporary_value.success) {
        result = { ...result, user: temporary_value.response};
      }
      break;
    case "devices":
      temporary_value = await getDevices(db, uid, did);
  
      if (temporary_value.success) {
        result = { ...result, devices: temporary_value.response};
      }
      break;
    case "deviceInfos":
      temporary_value = await getDeviceInfos(db, uid);

      if (temporary_value.success) {
        result = { ...result, deviceInfos: temporary_value.response};
      }
      break;
    case "contacts":
      temporary_value = await getContacts(db, uid);

      if (temporary_value.success) {
        result = { ...result, contacts: temporary_value.response};
      }
      break;
    }
  });

  return json(result, { status: 200 });
};