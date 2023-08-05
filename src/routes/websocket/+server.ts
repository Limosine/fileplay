import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { correctOnlineStatus, createKysely, updateLastSeen, updateOnlineStatus } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  // establish WebSocket connection (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

  console.log("New WebSocket connection, did: ", did);

  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  } else if (!did) {
    return new Response("No such device", { status: 401 });
  }

  const onlineStatus = async (status: number) => {
    const res = await updateOnlineStatus(db, did, status);

    if (status != 0) {
      if (res) server.send("1");
      else server.send("2");
    }
  };

  const lastSeen = async () => {
    const res = await updateLastSeen(db, uid, did);

    if (!res) server.send("2");
    else server.send("1");
  };

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  // @ts-ignore
  server.accept();

  onlineStatus(1);

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
