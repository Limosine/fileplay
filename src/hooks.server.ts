import { building } from "$app/environment";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";

import { createContext } from "$lib/trpc/server/routers/context";
import { router } from "$lib/trpc/router";

if (!building) {
  const wss = new WebSocketServer({
    port: 3001,
  });

  wss.removeAllListeners();
  const handler = applyWSSHandler({ wss, router: router, createContext });

  console.log("Listening on ws://127.0.0.1:3001");

  process.on("SIGTERM", () => {
    handler.broadcastReconnectNotification();
    wss.close();
    process.exit(143);
  });
}
