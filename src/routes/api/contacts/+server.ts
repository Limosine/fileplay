import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely, getContacts } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, cookies }) => {
  // get all contacts of this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  if (!uid) error(401, "No user associated with this device");

  const contacts = await getContacts(db, uid);

  if (contacts.success) {
    return json(contacts.response, { status: 200 });
  } else {
    return new Response(contacts.response, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ platform, url, cookies }) => {
  // delete a contact on both sides (requires cookie auth)
  // cid in query params
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);
  if (!uid) error(400, "No user associated with this device");

  const cid_s = url.searchParams.get("cid");
  if (!cid_s) error(400, "No contact id provided");
  const cid = parseInt(cid_s);

  const res1 = await db
    .deleteFrom("contacts")
    .where("cid", "=", cid)
    .where((eb) => eb("a", "=", uid).or("b", "=", uid))
    .returning("cid")
    .executeTakeFirst();

  if (!res1) error(404, "Contact not found");

  return new Response(null, { status: 200 });
};
