import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  // get all info about the user (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(cookies, key);

  const userInfo = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", db.selectFrom("devicesToUsers").select('uid').where("did", "=", did))
    .executeTakeFirstOrThrow();

  return json(userInfo);
};

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  // change user info (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(cookies, key);
  const updateValues = await request.json();

  const res1 = await db
    .updateTable("users")
    .set(updateValues)
    .where("id", "=", db.selectFrom("devicesToUsers").where("did", "=", did))
    .returning('id')
    .executeTakeFirst();
  
  if (res1) throw error(500, "Failed to update user info");

  return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async (request) => {
  // completely remove user and all devices (requires cookie auth)
  throw new Error("Not implemented");
};
