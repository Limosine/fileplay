import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  // TODO this doesnt work if called via wervice worker.
  // solution: create a seperate keepalive linked to user
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  await loadSignedDeviceID(cookies, key, db);  // updates lastSeen
  return new Response(null, { status: 204 });
};
