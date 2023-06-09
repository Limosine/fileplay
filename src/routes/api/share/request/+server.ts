import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import dayjs from "dayjs";
import { SHARING_TIMEOUT } from "$lib/common";
import { sendPushNotification } from "$lib/server/webpush";

// request sharing via contact id
export const GET: RequestHandler = async ({
  platform,
  cookies,
  url,
  fetch,
}) => {
  // todo make sure only contacts can share
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

  // get contact id from query params
  const cid_s = url.searchParams.get("cid");
  if (!cid_s) throw error(400, "No cid in query params");
  const cid = parseInt(cid_s);
  if (isNaN(cid)) throw error(400, "Invalid cid in query params");

  // get other user id from contact id
  const res1 = await db
    .selectFrom("contacts")
    .select("a as uid")
    .where(({ and, cmpr }) => and([cmpr("b", "=", uid), cmpr("cid", "=", cid)]))
    .union(
      db
        .selectFrom("contacts")
        .select("b as uid")
        .where(({ and, cmpr }) =>
          and([cmpr("a", "=", uid), cmpr("cid", "=", cid)])
        )
    )
    .executeTakeFirst();
  if (!res1) throw error(400, "Contact not found");

  const uid_to = res1.uid;

  const expires = dayjs().add(SHARING_TIMEOUT, "milliseconds").unix();

  // insert sharing request into db
  const res2 = await db
    .insertInto("sharing")
    .values({
      did,
      uid: uid_to,
      expires,
    })
    .returning("sid")
    .executeTakeFirst();
  if (!res2) throw error(500, "Failed to insert sharing request");

  // get user displayName
  const { displayName: sender } = await db
    .selectFrom("users")
    .select("displayName")
    .where("uid", "=", uid)
    .executeTakeFirstOrThrow();

  // send notification to all of contact's devices
  const dids = await db
    .selectFrom("devices")
    .select("did")
    .where("uid", "=", uid_to)
    .execute();

  let sent = 0;

  const promises = [];

  for (const { did: did_to } of dids) {
    // todo send notification
    promises.push(sendPushNotification(
      db,
      fetch,
      did_to,
      JSON.stringify({
        type: "sharing_request",
        sid: res2.sid,
        expires,
        sender,
        tag: `SHARE:${res2.sid}`,
      }),
      `SHARE:${res2.sid}`
    )
      .then(() => sent++)
      .catch(() => { }));
  }

  await Promise.all(promises);

  if (sent === 0) throw error(500, "Failed to send push notifications");

  return json({ sid: res2.sid });
};

// revoke sharing request to contact id. this sends a dummy notification with the same topic as the sharing message to all the same devices
export const DELETE: RequestHandler = async ({
  platform,
  cookies,
  url,
  fetch,
}) => {
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

  // get contact id from query params
  const cid_s = url.searchParams.get("cid");
  if (!cid_s) throw error(400, "No cid in query params");
  const cid = parseInt(cid_s);
  if (isNaN(cid)) throw error(400, "Invalid cid in query params");

  // get other user id from contact id
  const res1 = await db
    .selectFrom("contacts")
    .select("a as uid")
    .where(({ and, cmpr }) => and([cmpr("b", "=", uid), cmpr("cid", "=", cid)]))
    .union(
      db
        .selectFrom("contacts")
        .select("b as uid")
        .where(({ and, cmpr }) =>
          and([cmpr("a", "=", uid), cmpr("cid", "=", cid)])
        )
    )
    .executeTakeFirst();
  if (!res1) throw error(400, "Contact not found");

  const uid_to = res1.uid;

  // delete sharing request from db
  const res2 = await db
    .deleteFrom("sharing")
    .where(({ and, cmpr }) =>
      and([cmpr("did", "=", did), cmpr("uid", "=", uid_to)])
    )
    .returning("sid")
    .executeTakeFirst();

  if (!res2) throw error(500, "Failed to delete sharing request");

  // send notification to all of contact's devices on a best-effort basis
  const dids = await db
    .selectFrom("devices")
    .select("did")
    .where("uid", "=", uid_to)
    .execute();

  const promises = [];

  for (const { did: did_to } of dids) {
    // todo send notification
    promises.push(sendPushNotification(
      db,
      fetch,
      did_to,
      JSON.stringify({
        type: "sharing_cancel",
        tag: `SHARE:${res2.sid}`,
      }),
      `SHARE:${res2.sid}`
    ).catch(() => { }));
  }

  await Promise.all(promises);

  return new Response(null, { status: 204 });
};
