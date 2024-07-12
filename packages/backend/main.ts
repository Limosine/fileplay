/// <reference types="npm:@types/node" />

import { Hono } from "hono/mod.ts";
import { upgradeWebSocket } from "hono/adapter/deno/index.ts";
import { HandlerInterface as _HandlerInterface } from "hono/types.ts"; // Trigger download

import { EWSContext } from "./src/common.ts";
import { createConstants } from "./src/db.ts";
import { guestSecret } from "./src/values.ts";
import { webPush } from "./src/web-push.ts";
import { onClose, onMessage, onOpen } from "./src/ws.ts";
import { addHandlers } from "./src/http.ts";

// Initialize constants
export const constants = Object.freeze(await createConstants());

// State
export const clients = new Set<EWSContext>();

webPush();
await guestSecret();

// Add HTTP/WS Listener
const app = new Hono();

app.get(
  "/websocket",
  upgradeWebSocket((c) => {
    return {
      onOpen: (_, ws) => onOpen(ws, c),

      onMessage: (event, ws) => onMessage(ws, event.data),

      onClose: (_, ws) => onClose(ws),

      onError: (err, ws) => {
        console.warn("Error from client:", err);
        onClose(ws);
      },
    };
  })
);

addHandlers(app);

let port = Deno.env.get("PORT");
if (port === undefined) port = "8000";

Deno.serve({ port: parseInt(port) }, app.fetch);
