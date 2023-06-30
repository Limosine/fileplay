import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import dayjs from "dayjs";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, url }) => {
  // TODO this doesnt work if called via wervice worker.
  // solution: create a seperate keepalive linked to user
  const db = createKysely(platform);
  const keepAliveCode = url.searchParams.get("code");

  if (!keepAliveCode) {
    return new Response("Expected code", { status: 400 });
  }

  const res1 = await db
    .selectFrom("keepAliveCodes")
    .select("did")
    .where("code", "=", keepAliveCode)
    .executeTakeFirst();
  
  if (!res1) {
    return new Response("Invalid code", { status: 401 });
  }

  const { did } = res1;

  const { uid } = await db
    .updateTable("devices")
    .set({ lastSeenAt: dayjs().unix() })
    .where("did", "=", did)
    .returning("uid")
    .executeTakeFirstOrThrow();

  await db
    .updateTable("users")
    .set({ lastSeenAt: dayjs().unix() })
    .where("uid", "=", uid)
    .execute();

  return new Response(null, { status: 200 });
};
