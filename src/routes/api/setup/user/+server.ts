import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { isProfane } from "$lib/server/utils";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import dayjs from "dayjs";

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  // create a new user, link to current device (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid: already_uid } = await loadSignedDeviceID(cookies, key, db);
  if (already_uid) throw error(403, "Device already linked to user");

  const updateObject: {
    displayName: string;
    avatarSeed: string;
  } = await request.json();

  if (isProfane(updateObject.displayName))
    throw error(418, "Display name is profane"); // 418 I'm a teapot since this can only be triggered if someone manually f'ed with the api

  // insert new user into db
  const res1 = await db
    .insertInto("users")
    .values(updateObject)
    .returning("uid")
    .executeTakeFirst();

  if (!res1) throw error(500, "Failed to create user");

  const { uid } = res1;

  // link user to device
  await db
    .updateTable("devices")
    .set({ uid, linkedAt: dayjs().unix() })
    .where("did", "=", did)
    .returning("did")
    .executeTakeFirstOrThrow();

  return new Response(null, { status: 201 });
};
