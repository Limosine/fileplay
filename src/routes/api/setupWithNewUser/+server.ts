import { createKysely } from "$lib/server/db";
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { DeviceType } from "$lib/server/db";
import { loadKey, saveSignedDeviceID } from "$lib/server/crypto";
import { COOKIE_SIGNING_SECRET } from "$env/static/private";

export const POST: RequestHandler = async ({ platform, request, cookies }) => {
  // setup db
  const db = createKysely(platform);
  if (!db) throw error(500, "Database not configured");

  // extract values from request body
  const body = await request.json();
  const { device, user } = body;
  const ddn: string = device.displayName,
    dtype: DeviceType = device.type,
    udn: string = user.displayName,
    uas: string = user.avatarSeed;

  // insert values into db in one transaction and return the device id
  const txn_result = await db.transaction().execute(async (txn) => {
    const dres = await txn
      .insertInto("devices")
      .values({ displayName: ddn, type: dtype })
      .returning("id")
      .executeTakeFirstOrThrow();

    const ures = await txn
      .insertInto("users")
      .values({ displayName: udn, avatarSeed: uas })
      .returning("id")
      .executeTakeFirstOrThrow();

    return await txn
      .insertInto("devicesUsers")
      .values({ did: dres.id, uid: ures.id })
      .returning("did")
      .executeTakeFirstOrThrow();
  });

  const did = txn_result.did.toString();

  // save device id in hmac signed cookie
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  saveSignedDeviceID(did, cookies, key);

  return new Response(null, { status: 200 });
};
