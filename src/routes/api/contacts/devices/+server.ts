import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, platform }) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);

  const contacts = await db
    .selectFrom("contacts")
    .innerJoin("users", "contacts.a", "users.uid")
    .select([
      "users.uid",
    ])
    .where("contacts.b", "=", uid)
    .union(
      db
        .selectFrom("contacts")
        .innerJoin("users", "contacts.b", "users.uid")
        .select([
          "users.uid",
        ])
        .where("contacts.a", "=", uid)
    )
    .execute();

  const devices = await db
    .selectFrom("devices")
    .select(["did", "type", "displayName", "peerJsId", "encryptionPublicKey"])
    .where(({ and, cmpr }) => and([cmpr("uid", "in", contacts.map(contact => contact.uid)), cmpr("devices.isOnline", "=", 1)]))
    .orderBy("displayName")
    .execute();

  return json(devices, { status: 200 });
};