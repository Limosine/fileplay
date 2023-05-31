import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, saveSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import dayjs from "dayjs";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ platform, request, cookies }) => {
  // post device info here, create a new device (sets cookie auth)
  const db = createKysely(platform);

  const { displayName, type } = await request.json();

  // insert new device into db
  const res = await db
    .insertInto("devices")
    .values({ displayName, type, createdAt: dayjs().unix() })
    .returning("id")
    .executeTakeFirstOrThrow();

  // save device id in hmac signed cookie
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  await saveSignedDeviceID(res.id, cookies, key);

  return new Response(null, { status: 201 });
};

// next step in onboarding: either redeem an advertisement code or create a new user using POST /api/setup/user
