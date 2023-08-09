import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely, getContacts, getDeviceInfos, getDevices, getUser, updateLastSeen } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid, did } = await loadSignedDeviceID(cookies, key, db);
  if (!uid) throw error(401, "No user associated with this device");

  await updateLastSeen(db, uid, did);

  const requested = url.searchParams.get("request")?.split(",");

  let result = {};

  if (requested !== undefined) {
    for (let i = 0; i < requested.length; i++) {
      if (requested[i] == "user") {
        const user = await getUser(db, uid);

        if (user.success) {
          result = { ...result, user: user.response };
        }
      } else if (requested[i] == "devices") {
        const devices = await getDevices(db, uid, did);

        if (devices.success) {
          result = { ...result, devices: devices.response };
        }
      } else if (requested[i] == "deviceInfos") {
        const deviceInfos = await getDeviceInfos(db, uid);

        if (deviceInfos.success) {
          result = { ...result, deviceInfos: deviceInfos.response };
        }
      } else if (requested[i] == "contacts") {
        const contacts = await getContacts(db, uid);

        if (contacts.success) {
          result = { ...result, contacts: contacts.response };
        }
      }
    }
  }

  console.log(result);

  return json(result, { status: 200 });
};