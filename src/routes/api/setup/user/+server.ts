import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { isProfane } from "$lib/server/utils";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  // create a new user, link to current device (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(cookies, key);

  const { displayName, avatarSeed } = await request.json();

  if (isProfane(displayName)) throw error(418, "Display name is profane"); // 418 I'm a teapot since this can only be triggered if someone manually f'ed with the api

  // insert new user into db
  const { uid } = await db
    .insertInto("users")
    .values({ displayName, avatarSeed })
    .returning("uid")
    .executeTakeFirstOrThrow();

  // link user to device
  await db
    .insertInto("devicesToUsers")
    .values({ did, uid })
    .returning("did")
    .executeTakeFirstOrThrow();

  return new Response(null, { status: 201 });
};
