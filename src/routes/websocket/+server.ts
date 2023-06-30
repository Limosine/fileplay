import { COOKIE_SIGNING_SECRET } from "$env/static/private";
import { loadKey, loadSignedDeviceID } from "$lib/server/crypto";
import { createKysely } from "$lib/server/db";
import dayjs from "dayjs";
import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ request, cookies, platform }) => {
  // get all devices linked to this account (requires cookie auth)
  const db = createKysely(platform);
  const key = await loadKey(COOKIE_SIGNING_SECRET);
  const { did, uid } = await loadSignedDeviceID(cookies, key, db);

  if (!platform || !platform.env) {
    return new Response("Expected platform", { status: 500 });
  }

  if (!uid) {
    return new Response("Expected uid", { status: 401 });
  }

  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  // edit request to include device id
  const url = new URL(request.url);
  url.searchParams.append("did", did.toString());
  url.searchParams.append("uid", uid.toString());
  const new_request = new Request(url.toString(), request);

  const id = platform.env.MESSAGE_WS.newUniqueId();
  const message_ws_do = platform.env.MESSAGE_WS.get(id);

  const res1 = await db
    .updateTable("devices")
    .set({ websocketId: id.toString(), lastUsedConnection: 'websocket' })
    .where("did", "=", did)
    .returning('did')
    .executeTakeFirst();
  
  if (!res1) throw error(500, "Failed to create websocket id")

  return await message_ws_do.fetch(new_request);
};
