import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ platform, cookies, request }) => {
  // create a new user, link to current device (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(cookies, key);

  const { displayName, avatarSeed } = await request.json();

  // insert new user into db
  const { id: uid } = await db
    .insertInto("users")
    .values({ displayName, avatarSeed })
    .returning("id")
    .executeTakeFirstOrThrow();
  
  // link user to device
  await db
    .insertInto("devicesToUsers")
    .values({ did, uid })
    .returning("did")
    .executeTakeFirstOrThrow();
  
  return new Response(null, { status: 201 });

};
