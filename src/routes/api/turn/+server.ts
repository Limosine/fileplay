import {
  COOKIE_SIGNING_SECRET,
  PRIVATE_TURN_PWD,
  PRIVATE_TURN_URL,
  PRIVATE_TURN_USERNAME,
} from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies, request }) => {
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  if (!uid) throw error(400, "No user associated with this device");

  const body = {
    turnUrl: PRIVATE_TURN_URL,
    turnPassword: PRIVATE_TURN_PWD,
    turnUsername: PRIVATE_TURN_USERNAME,
  };
  return json(body, { status: 200 });
};
