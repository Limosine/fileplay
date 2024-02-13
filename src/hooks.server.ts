import { building } from "$app/environment";
import { WebSocketServer } from "ws";

import { createConstants } from "$lib/server/db";
import { authenticate } from "$lib/websocket/server/lib/context";
import { decode } from "@msgpack/msgpack";
import {
  handleMessage,
  sendMessage,
  type ExtendedWebSocket,
  type MessageFromClient,
} from "$lib/websocket/common";

export let clients = new Set<ExtendedWebSocket>();

if (!building) {
  const wss = new WebSocketServer({
    port: 3001,
  });

  clients = wss.clients as Set<ExtendedWebSocket>;
  const constants = await createConstants();

  wss.on("connection", async (client: ExtendedWebSocket, req) => {
    const ids = await authenticate(constants.db, constants.cookieKey, req);

    // Check authorization
    if (ids.guest === null && (ids.device === null || ids.user === null)) {
      return client.close(1008, "Unauthorized");
    }

    // Fill properties
    client.isAlive = true;
    client.device = ids.device;
    client.user = ids.user;
    client.guest = ids.guest;

    // Listeners
    client.on("message", async (data) => {
      const decodedData = decode(data as BufferSource) as MessageFromClient;
      try {
        console.log(decodedData);
        await handleMessage(constants, client, ids, decodedData);
      } catch (e: any) {
        sendMessage(client, { id: decodedData.id, type: "error", data: e });
      }
    });

    client.on("pong", () => {
      client.isAlive = true;
    });

    client.on("error", (err) => {
      console.warn("Error from client:", err);
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const ews = ws as ExtendedWebSocket;

      if (ews.isAlive === false) return ews.terminate();

      ews.isAlive = false;
      ews.ping();
    });
  }, 5000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  wss.on("listening", () => {
    console.log("Listening on ws://127.0.0.1:3001");
  });

  process.on("SIGTERM", () => {
    wss.close();
    process.exit(143);
  });
}
