import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

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

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};