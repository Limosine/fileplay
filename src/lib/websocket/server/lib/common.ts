import type { WebSocket } from "ws";

import { sign } from "$lib/server/signing";
import { sendMessage } from "$lib/websocket/common";

export const getTurnCredentials = async (
  client: WebSocket,
  id: number,
  user: string,
  key: CryptoKey,
) => {
  const unixTimeStamp = Math.ceil(Date.now() / 1000) + 12 * 3600; // 12 hours

  const username = [unixTimeStamp, user].join(":");
  const password = await sign(username, key, "base64");

  console.log("Credentials:", username, password);

  sendMessage(client, {
    id,
    type: "turnCredentials",
    data: { username, password },
  });
};
