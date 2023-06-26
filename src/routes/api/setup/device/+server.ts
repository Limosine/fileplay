import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, saveSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { DeviceType } from "$lib/common";
import { nanoid } from "nanoid";

export const POST: RequestHandler = async ({ platform, request, cookies }) => {
  // post device info here, create a new device (sets cookie auth)
  const db = createKysely(platform);

  const { displayName, type } = (await request.json()) as {
    displayName: string;
    type: DeviceType;
  };

  // insert new device into db
  const res = await db
    .insertInto("devices")
    .values({ displayName, type })
    .returning("did")
    .executeTakeFirst();
  if (!res) throw error(500, "Failed to create new device");

  // create keepalive code
  const { code } = await db
    .insertInto("keepAliveCodes")
    .values({ code: nanoid(), did: res.did })
    .returning("code")
    .executeTakeFirstOrThrow();

  // save device id in hmac signed cookie
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  await saveSignedDeviceID(res.did, cookies, key);

  return json({ keepAliveCode: code }, { status: 201 });
};

// next step in onboarding: either redeem an advertisement code or create a new user using POST /api/setup/user
