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
  server.addEventListener('message', event => {
    server.send("Message recieved.")
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};