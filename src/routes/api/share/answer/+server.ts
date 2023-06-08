import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import dayjs from "dayjs";
import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { sendPushNotification } from "$lib/server/webpush";

// accept a sharing request
export const POST: RequestHandler = async ({ platform, request, cookies }) => {
  // todo revoke offer for this user and clear all notifications
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

  const { sid, peerJsId, encryptionPublicKey } = await request.json();

  // get sharing request
  const res1 = await db
    .deleteFrom("sharing")
    .where(({ and, cmpr }) =>
      and([
        cmpr("sid", "=", sid),
        cmpr("uid", "=", uid),
        cmpr("expires", ">", dayjs().unix()),
      ])
    )
    .returning("did")
    .executeTakeFirst();

  if (!res1) throw error(404, "Sharing request not found");

  const { did: did_return } = res1;

  // revoke all other devices' requests
  const dids = await db
    .selectFrom("devices")
    .select("did")
    .where("uid", "=", uid)
    .execute();

  for (const { did: did_to } of dids) {
    // todo send notification
    await sendPushNotification(
      db,
      fetch,
      did_to,
      JSON.stringify({
        type: "sharing_cancel",
        sid: sid,
      }),
      `S_REQ:${sid}`
    ).catch(() => {});
  }

  // send accept notification to did_return
  await sendPushNotification(
    db,
    fetch,
    did_return,
    JSON.stringify({
      type: "sharing_accept",
      peerJsId,
      encryptionPublicKey,
      uid
    })
  );

  return new Response(null, { status: 200 });
};

// todo DELETE for rejecting a sharing request
