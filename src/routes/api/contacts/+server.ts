import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  // get all contacts of this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  if(!uid) throw error(400, "No user associated with this device")

  const contacts = await db
    .selectFrom("contacts")
    .innerJoin("users", "contacts.a", "users.uid")
    .select([
      "contacts.cid",
      "users.displayName",
      "users.avatarSeed",
      "contacts.createdAt as linkedAt",
      "users.lastSeenAt"
    ])
    .where("contacts.b", "=", uid)
    .union(
      db
        .selectFrom("contacts")
        .innerJoin("users", "contacts.b", "users.uid")
        .select([
          "contacts.cid",
          "users.displayName",
          "users.avatarSeed",
          "contacts.createdAt as linkedAt",
          "users.lastSeenAt"
        ])
        .where("contacts.a", "=", uid)
    )
    .orderBy("displayName")
    .execute();

  return json(contacts);
};

export const DELETE: RequestHandler = async ({ platform, url, cookies }) => {
  // delete a contact on both sides (requires cookie auth)
  // cid in query params
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  if(!uid) throw error(400, "No user associated with this device")

  const cid_s = url.searchParams.get("cid");
  if (!cid_s) throw error(400, "No contact id provided");
  const cid = parseInt(cid_s);

  const res1 = await db
    .deleteFrom("contacts")
    .where("cid", "=", cid)
    .where(({ or, cmpr }) => or([cmpr("a", "=", uid), cmpr("b", "=", uid)]))
    .returning("cid")
    .executeTakeFirst();

  if (!res1) throw error(404, "Contact not found");

  return new Response(null, { status: 204 });
};
