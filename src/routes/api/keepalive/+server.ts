import { createKysely } from "$lib/server/db";
import dayjs from "dayjs";
import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ platform, url }) => {
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

  const { uid, websocketId, pushSubscription, lastUsedConnection } = await db
    .updateTable("devices")
    .set({ lastSeenAt: dayjs().unix() })
    .where("did", "=", did)
    .returning(["uid", "websocketId", "pushSubscription", "lastUsedConnection"])
    .executeTakeFirstOrThrow();
  
  // check if there is a connection to keep alive anyways
  if ((lastUsedConnection === "push" && !pushSubscription) ||
    (lastUsedConnection === "websocket" && !websocketId))
    throw error(400, "No connection to keep alive!")

  await db
    .updateTable("users")
    .set({ lastSeenAt: dayjs().unix() })
    .where("uid", "=", uid)
    .execute();

  return new Response(null, { status: 200 });
};
