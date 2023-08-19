import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely, getUser } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  // get all info about the user (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  if (!uid) throw error(401, "No user associated with this device");

  const user = await getUser(db, uid);

  if (user.success) {
    return json(user.response, { status: 200 });
  } else {
    return new Response(user.response, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  // change user info (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  const updateValues: {
    displayName?: string;
    avatarSeed?: string;
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

export const DELETE: RequestHandler = async ({ platform, cookies }) => {
  // completely remove user and all devices (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);

  try {
    await db.deleteFrom("devices").where("devices.uid", "=", uid).execute();

    await db.deleteFrom("users").where("uid", "=", uid).execute();

    cookies.delete("did_sig", { path: "/" });
    cookies.delete("did", { path: "/" });
    return new Response(null, { status: 200 });
  } catch (e: any) {
    return new Response(e, { status: 500 });
  }
};
