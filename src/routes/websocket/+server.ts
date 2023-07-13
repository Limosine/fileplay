import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import dayjs from "dayjs";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  // establish WebSocket connection (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did } = await loadSignedDeviceID(cookies, key, db);
  if (!did) throw error(401, "No such device");

  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const onlineStatus = async (status: number) => {
    const update = {isOnline: status};

    const res = await db
      .updateTable("devices")
      .set(update)
      .where(({ cmpr }) =>
        cmpr("did", "=", did)
      )
      .returning("isOnline")
      .executeTakeFirst();

    if (status != 0) {
      if (!res) server.send("2");
      else server.send(res.isOnline.toString());
    }
  };

  const lastSeen = async () => {
    const res = await db
      .updateTable("devices")
      .set({lastSeenAt: dayjs().unix()})
      .where(({ cmpr }) =>
        cmpr("did", "=", did)
      )
      .returning("lastSeenAt")
      .executeTakeFirst();

    if (!res) server.send("2");
    else server.send("1");
  };

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();
  onlineStatus(1);

  server.addEventListener('close', async () => {
    onlineStatus(0);
  });

  server.addEventListener('error', async () => {
    onlineStatus(0);
  });

  server.addEventListener('message', async (event) => {
    if (event.data == "ping") {
      lastSeen();
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};
