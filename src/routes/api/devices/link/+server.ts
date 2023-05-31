import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { LINKING_EXPIRY_TIME, LINKING_REFRESH_TIME } from "$lib/common";
import dayjs from "dayjs";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  // returns an advertisement code that can be redeemed to link a device to the connected user (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(cookies, key);

  // get uid
  const { uid } = await db
    .selectFrom("devicesToUsers")
    .select("uid")
    .where("did", "=", did)
    .executeTakeFirstOrThrow();

  // generate a code
  let code: string;
  const alphabet = "0123456789ABCDEF";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  } while (
    await db
      .selectFrom("devicesLinkCodes")
      .select("code")
      .where("code", "=", code)
      .executeTakeFirst()
  );

  // set expiration date
  const expires = dayjs().add(LINKING_EXPIRY_TIME, "millisecond").unix();

  // insert the code into the devicesLinkCodes table
  await db
    .insertInto("devicesLinkCodes")
    .values({ code, uid, expires, created_did: did })
    .returning("code")
    .execute();

  return json({ code, expires, refresh: LINKING_REFRESH_TIME });
};

export const POST: RequestHandler = async ({ platform, request, cookies }) => {
  // link a device to the user's account by redeeming an advertisement code (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(cookies, key);
  const { code: code_any } = await request.json();
  const code = (code_any as string).toUpperCase().replaceAll("O", "0"); // normalize code

  // get uid to link to
  const res1 = await db
    .selectFrom("devicesLinkCodes")
    .select("uid")
    .where("code", "=", code)
    .where("expires", ">", dayjs().unix())
    .executeTakeFirst();

  if (!res1) throw error(404, "Invalid code");

  // delete existing devicesToUsers linking if exists
  await db.deleteFrom("devicesToUsers").where("did", "=", did).execute();

  // insert new linking
  const res2 = await db
    .insertInto("devicesToUsers")
    .values({ did: did, uid: res1.uid })
    .returning("did")
    .executeTakeFirst();
  if (!res2) throw error(500, "Could not link device");

  return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async ({ platform, cookies }) => {
  // revoke the current advertisement code (also happens after 15 minutes, code is refreshed after 10) (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const did = await loadSignedDeviceID(cookies, key);

  // get uid
  const { uid } = await db
    .selectFrom("devicesToUsers")
    .select("uid")
    .where("did", "=", did)
    .executeTakeFirstOrThrow();

  // delete the code
  const res1 = await db
    .deleteFrom("devicesLinkCodes")
    .where("uid", "=", uid)
    .where("created_did", "=", did) // only the device that created the code can revoke it
    .returningAll()
    .executeTakeFirst();
  if (!res1) throw error(500, "Could not revoke code");

  return new Response(null, { status: 204 });
};
