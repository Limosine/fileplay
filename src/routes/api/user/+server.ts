import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  // get all info about the user (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);

  const userInfo = await db
    .selectFrom("users")
    .select(["uid", "displayName", "avatarSeed", "createdAt", "lastSeenAt"])
    .where("uid", "=", uid)
    .executeTakeFirstOrThrow();

  return json(userInfo);
};

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  // change user info (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  const updateValues: {
    displayName?: string,
    avatarSeed?: string,
  } = await request.json();

  const res1 = await db
    .updateTable("users")
    .set(updateValues)
    .where("uid", "=", uid)
    .returning("uid")
    .executeTakeFirst();

  if (!res1) throw error(500, "Failed to update user info");

  return new Response(null, { status: 200 });
};

export const DELETE: RequestHandler = async () => {
  // completely remove user and all devices (requires cookie auth)
  throw new Error("Not implemented");
};
