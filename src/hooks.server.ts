import { building } from "$app/environment";
import type { IncomingMessage } from "http";
import { decode } from "@msgpack/msgpack";
import type { Handle } from "@sveltejs/kit";
import { WebSocketServer } from "ws";

import { createConstants } from "$lib/server/db";
import {
  messageFromClientSchema,
  type ExtendedWebSocket,
  type MessageFromClient,
} from "$lib/api/common";
import { authenticate } from "$lib/api/server/context";
import {
  closeGuestConnection,
  handleMessage,
  notifyDevices,
  sendMessage,
} from "$lib/api/server/main";

export let clients = new Set<ExtendedWebSocket>();

if (!building) {
  const wss = new WebSocketServer({
    port: 3001,
  });

  clients = wss.clients as Set<ExtendedWebSocket>;
  const constants = await createConstants();

  wss.on(
    "connection",
    async (client: ExtendedWebSocket, req: IncomingMessage) => {
      const ids = await authenticate(constants.db, constants.cookieKey, req);

      if (req.url !== undefined) {
        const url = new URL(req.url, `https://${req.headers.host}`);
        const type = url.searchParams.get("type");

        if (type == "main") ids.guest = null;
        else if (type == "guest") {
          ids.device = null;
          ids.user = null;
        }
      } else return client.close(1008, "Unauthorized");

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
        const decodedData = decode(
          data as BufferSource,
        ) as MessageFromClient & {
          id: number;
        };
        try {
          const message = messageFromClientSchema.parse(decodedData);
          await handleMessage(constants, client, ids, message);
        } catch (e: any) {
          sendMessage(client, {
            id: decodedData.id,
            type: "error",
            data: e instanceof Error ? e.message : e,
          });
        }
      });

      client.on("pong", () => {
        client.isAlive = true;
      });

      if (ids.user !== null || ids.guest !== null) {
        client.on("close", () => {
          if (ids.user !== null)
            notifyDevices(constants.db, "contact", ids.user);
          if (ids.guest !== null && client.guestTransfer !== undefined)
            closeGuestConnection(ids.guest * -1, client.guestTransfer);
        });
      }

      client.on("error", (err) => {
        console.warn("Error from client:", err);
      });
    },
  );

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

export const handle: Handle = async ({ resolve, event }) => {
  if (event.url.pathname.startsWith("/api")) {
    if (event.request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }
  }

  const response = await resolve(event);
  if (event.url.pathname.startsWith("/api")) {
    response.headers.append("Access-Control-Allow-Origin", "*");
  }
  return response;
};
