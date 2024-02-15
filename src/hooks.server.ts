import { building } from "$app/environment";
import { decode } from "@msgpack/msgpack";
import { WebSocketServer } from "ws";

import { createConstants } from "$lib/server/db";
import {
  type ExtendedWebSocket,
  type MessageFromClient,
} from "$lib/websocket/common";
import { authenticate } from "$lib/websocket/server/context";
import {
  closeConnections,
  handleMessage,
  notifyDevices,
  sendMessage,
} from "$lib/websocket/server/main";

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

    // Notify devices
    if (ids.user) notifyDevices(constants.db, "contact", ids.user);

    // Listeners
    client.on("message", async (data) => {
      const decodedData = decode(data as BufferSource) as MessageFromClient;
      try {
        await handleMessage(constants, client, ids, decodedData);
      } catch (e: any) {
        sendMessage(client, { id: decodedData.id, type: "error", data: e });
      }
    });

    client.on("pong", () => {
      client.isAlive = true;
    });

    if (ids.device !== null || ids.guest !== null) {
      client.on("close", () => {
        if (ids.user !== null) notifyDevices(constants.db, "contact", ids.user);
        if (ids.device !== null) closeConnections(ids.device);
        if (ids.guest !== null) closeConnections(ids.guest);
      });
    }

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
