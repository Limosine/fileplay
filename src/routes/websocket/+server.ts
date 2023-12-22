import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import {
  correctOnlineStatus,
  createKysely,
  getContacts,
  getDeviceInfos,
  getDevices,
  getUser,
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
  } else if (!uid) {
    return new Response("No user associated with this device", { status: 401 });
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
      if (res) server.send(JSON.stringify({method: "get", type: "pong", successful: true}));
      else server.send(JSON.stringify({method: "get", type: "pong", successful: false}));
    }
  };

  const lastSeen = async () => {
    const res = await updateLastSeen(db, did);

    if (!res) server.send(JSON.stringify({method: "get", type: "pong", successful: false}));
    else server.send(JSON.stringify({method: "get", type: "pong", successful: true}));
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
    const request = JSON.parse(event.data);

    if (request.method == "get") {
      if (request.type == "ping") {
        lastSeen();
        correctOnlineStatus(db);

      } else if (request.type == "user") {
        const response = request;
        const data = await getUser(db, uid);

        response.successful = data.success;
        response.data = data.response;
        server.send(JSON.stringify(response));

      } else if (request.type == "devices") {
        const response = request;
        const data = await getDevices(db, uid, did);

        response.successful = data.success;
        response.data = data.response;
        server.send(JSON.stringify(response));

      } else if (request.type == "deviceInfos") {
        const response = request;
        const data = await getDeviceInfos(db, uid);

        response.successful = data.success;
        response.data = data.response;
        server.send(JSON.stringify(response));

      } else if (request.type == "contacts") {
        const response = request;
        const data = await getContacts(db, uid);

        response.successful = data.success;
        response.data = data.response;
        server.send(JSON.stringify(response));
      }
    }
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
};
