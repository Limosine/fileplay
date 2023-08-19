import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import {
  correctOnlineStatus,
  createKysely,
  updateLastSeen,
  updateOnlineStatus,
} from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  // establish WebSocket connection (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  } else if (!did) {
    return new Response("No such device", { status: 401 });
  }

  const onlineStatus = async (status: number) => {
    const res = await updateOnlineStatus(db, did, status);

    if (status == 0) {
      const devices = await db
        .selectFrom("devices")
        .select("did")
        .where("isOnline", "=", 1)
        .execute();

      if (devices.length == 0 && uid) {
        await db
          .updateTable("users")
          .set({ isOnline: 0 })
          .where("uid", "=", uid)
          .returning("isOnline")
          .executeTakeFirst();
      }
    } else {
      if (res) server.send("1");
      else server.send("2");
    }
  };

  const lastSeen = async () => {
    const res = await updateLastSeen(db, did);

    if (!res) server.send("2");
    else server.send("1");
  };

  const { 0: client, 1: server } = new WebSocketPair();

  // @ts-ignore
  server.accept();

  server.addEventListener("close", async () => {
    onlineStatus(0);
  });

  server.addEventListener("error", async () => {
    onlineStatus(0);
  });

  server.addEventListener("message", async (event) => {
    if (event.data == "ping") {
      lastSeen();
      correctOnlineStatus(db);
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};
