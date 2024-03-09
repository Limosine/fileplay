import { building } from "$app/environment";
import type { IncomingMessage } from "http";
import { decode } from "@msgpack/msgpack";
import type { Handle } from "@sveltejs/kit";
import { WebSocketServer } from "ws";

import { env } from "$env/dynamic/private";
import { env as envPublic } from "$env/dynamic/public";
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
  const port = env.WS_PORT === undefined ? 3001 : Number(env.WS_PORT);

  const wss = new WebSocketServer({ port });

  clients = wss.clients as Set<ExtendedWebSocket>;
  const constants = await createConstants();

  wss.on(
    "connection",
    async (client: ExtendedWebSocket, req: IncomingMessage) => {
      // Assign client to guests or registered users
      const getIds = (ids: {
        device: number | null;
        user: number | null;
        guest: number | null;
      }) => {
        if (req.url !== undefined) {
          const url = new URL(req.url, `https://${req.headers.host}`);
          const type = url.searchParams.get("type");

          if (type == "main") ids.guest = null;
          else if (type == "guest") {
            ids.device = null;
            ids.user = null;
          }
          return ids;
        } else {
          client.close(1008, "Unauthorized, no type specified");
          return false;
        }
      };

      // Initialize ping property
      client.isAlive = true;

      // Don't await authentication to avoid missing messages
      const ids = authenticate(constants.db, constants.cookieKey, req);

      // Listeners
      client.on("message", async (data) => {
        const decodedData = decode(
          data as BufferSource,
        ) as MessageFromClient & {
          id: number;
        };
        try {
          const awaited = getIds(await ids);
          if (!awaited) return;

          await handleMessage(
            constants,
            client,
            awaited,
            messageFromClientSchema.parse(decodedData),
          );
        } catch (e: any) {
          sendMessage(
            client,
            {
              id: decodedData.id,
              type: "error",
              data: e instanceof Error ? e.message : e,
            },
            false,
          );
        }
      });

      client.on("pong", () => {
        client.isAlive = true;
      });

      client.on("error", (err) => {
        console.warn("Error from client:", err);
      });

      const awaited = getIds(await ids);
      if (!awaited) return;

      if (awaited.user !== null || awaited.guest !== null) {
        client.on("close", () => {
          if (awaited.user !== null)
            notifyDevices(constants.db, "contact", awaited.user);
          if (awaited.guest !== null && client.guestTransfer !== undefined)
            closeGuestConnection(awaited.guest * -1, client.guestTransfer);
        });
      }

      // Check authorization
      if (
        awaited.guest === null &&
        (awaited.device === null || awaited.user === null)
      ) {
        return client.close(1008, "Unauthorized");
      }

      // Fill properties
      client.device = awaited.device;
      client.user = awaited.user;
      client.guest = awaited.guest;

      // Notify devices
      if (awaited.user) notifyDevices(constants.db, "contact", awaited.user);
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
  if (envPublic.PUBLIC_HOSTNAME === undefined)
    throw new Error("Please define a public hostname.");

  const allowedOrigins: string[] = [
    "cap.fileplay.me",
    envPublic.PUBLIC_HOSTNAME,
  ];

  const getOriginHeader = () =>
    allowedOrigins.includes(event.url.hostname)
      ? `${event.url.protocol}//${event.url.hostname}`
      : envPublic.PUBLIC_HOSTNAME === undefined
        ? ""
        : `https://${envPublic.PUBLIC_HOSTNAME}`;

  if (event.url.pathname.startsWith("/api")) {
    if (event.request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": getOriginHeader(),
          Vary: "Origin",
        },
      });
    }
  }

  const response = await resolve(event);
  if (event.url.pathname.startsWith("/api")) {
    response.headers.append("Access-Control-Allow-Origin", getOriginHeader());
    response.headers.append("Vary", "Origin");
  }
  return response;
};
