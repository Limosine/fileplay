import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import dayjs from "dayjs";
import { SHARING_TIMEOUT } from "$lib/common";
import { sendNotification } from "$lib/server/notifications";

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
  const { displayName: sender, avatarSeed } = await db
    .selectFrom("users")
    .select(["displayName", "avatarSeed"])
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
    promises.push(
      sendNotification(
        platform as App.Platform,
        fetch,
        did_to,
        JSON.stringify({
          type: "sharing_request",
          data: {
            sid: res2.sid,
            expires,
            sender,
            avatarSeed,
            tag: `SHARE:${res2.sid}`,
          },
        }),
        `SHARE:${res2.sid}`
      )
        .then(() => sent++)
        .catch((e) => {
          console.error(e);
        })
    );
  }

  await Promise.all(promises);

  if (sent === 0) throw error(500, "Failed to send notifications");

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
    promises.push(
      sendNotification(
        platform as App.Platform,
        fetch,
        did_to,
        JSON.stringify({
          type: "sharing_cancel",
          data: { tag: `SHARE:${res2.sid}` },
        }),
        `SHARE:${res2.sid}`
      ).catch((r) => console.log(r));
    );
  }

  await Promise.all(promises);

  return new Response(null, { status: 200 });
};
