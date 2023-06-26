import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import dayjs from "dayjs";
import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { sendNotification } from "$lib/server/notifications";

// accept a sharing request
export const POST: RequestHandler = async ({ platform, request, cookies }) => {
  // todo revoke offer for this user and clear all notifications
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { uid } = await loadSignedDeviceID(cookies, key, db);

  const { sid, peerJsId, encryptionPublicKey } = await request.json() as any;

  // get sharing request
  const res1 = await db
    .selectFrom("sharing")
    .select("did")
    .where(({ and, cmpr }) =>
      and([
        cmpr("sid", "=", sid),
        cmpr("uid", "=", uid),
        cmpr("expires", ">", dayjs().unix()),
      ])
    )
    .executeTakeFirst();

  if (!res1) throw error(404, "Sharing request not found");

  const { did: did_return } = res1;

  // revoke all other devices' requests
  // disabled
  // const dids = await db
  //   .selectFrom("devices")
  //   .select("did")
  //   .where("uid", "=", uid)
  //   .execute();

  // const promises = [];
  // for (const { did: did_to } of dids) {
  //   // todo send notification
  //   promises.push(
  //     sendPushNotification(
  //       db,
  //       fetch,
  //       did_to,
  //       JSON.stringify({
  //         type: "sharing_cancel",
  //         tag: `SHARE:${sid}`,
  //       }),
  //       `SHARE:${sid}`
  //     ).catch(() => {})
  //   );
  // }

  // await Promise.all(promises);

  // send accept notification to did_return
  await sendNotification(
    platform as App.Platform,
    fetch,
    did_return,
    JSON.stringify({
      type: "share_accepted",
      peerJsId,
      encryptionPublicKey,
      sid,
    })
  );

  return new Response(null, { status: 204 });
};

// todo DELETE for rejecting a sharing request on all devices
export const DELETE: RequestHandler = async ({
  cookies,
  platform,
  request,
  fetch,
}) => {
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

  const { sid } = await request.json() as any;

  // get and delete sharing request
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

  await sendNotification(
    platform as App.Platform,
    fetch,
    did_return,
    JSON.stringify({
      type: "share_rejected",
      sid,
    })
  );

  // revoke all other devices' requests
  const dids = await db
    .selectFrom("devices")
    .select("did")
    .where("uid", "=", uid)
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
          tag: `SHARE:${sid}`,
        }),
        `SHARE:${sid}`
      ).catch(() => {})
    );
  }
  await Promise.all(promises);

  return new Response(null, { status: 204 });
};
