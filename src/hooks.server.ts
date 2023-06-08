import { COOKIE_SIGNING_SECRET } from '$env/static/private';
import { loadKey, loadSignedDeviceID } from '$lib/server/crypto';
import { createKysely } from '$lib/server/db';
import type { Database } from '$lib/db';

async function onlineStatus(status: number, db: Database, server: any, did: number)  {
  const update = {isOnline: status};

  const res = await db
    .updateTable("devices")
    .set(update)
    .where(({ cmpr }) =>
      cmpr("did", "=", did)
    )
    .returning("did")
    .executeTakeFirst();

  if (!res) server.send("ERROR: 'Failed to update device info'");
}


/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/websocket')) {

    const upgradeHeader = event.request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const db = createKysely(event.platform);
    const key = await loadKey(COOKIE_SIGNING_SECRET);
    const { did } = await loadSignedDeviceID(event.cookies, key, db);

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
  
    server.accept();
    server.addEventListener('message', event => {
      server.send("Message recieved.")
      if (event.data == "isOnline") {
        server.send("Got request.");
        onlineStatus(1, db, server, did);
      }
    });
    server.addEventListener('close', () => {
      onlineStatus(0, db, server, did);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  const response = await resolve(event);
  return response;
}