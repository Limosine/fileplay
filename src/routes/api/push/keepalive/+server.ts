import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);
  if (!did || !uid) throw error(401, "Not authenticated");
  return new Response(null, { status: 204 });
};
