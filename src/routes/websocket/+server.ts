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

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();
  server.addEventListener('message', async (event) => {
    if (event.data == "isOnline") {
      server.send("Message recieved.")

      const update = {isOnline: 1};

      const res = await db
        .updateTable("devices")
        .set(update)
        .where(({ cmpr }) =>
          cmpr("did", "=", did)
        )
        .returning("did")
        .executeTakeFirst();

      if (!res) server.send("ERROR: 'Failed to update device info'");
      else server.send(res);
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};