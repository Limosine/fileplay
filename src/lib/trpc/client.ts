import { get, writable } from "svelte/store";
import {
  type CreateTRPCClientOptions,
  createTRPCProxyClient,
  createWSClient,
  wsLink,
} from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

import { startHeartbeat, startSubscriptions } from "$lib/lib/fetchers";

import type { Router } from "./server/main";

const browserClient =
  writable<ReturnType<typeof createTRPCWebSocketClient<Router>>>();

function createTRPCWebSocketClient<Router extends AnyRouter>(): ReturnType<
  typeof createTRPCProxyClient<Router>
  > {
  if (typeof location === "undefined") throw new Error();

  const uri = `${location.protocol === "http:" ? "ws:" : "wss:"}//${
    location.host
  }/api/trpc`;

  const wsClient = createWSClient({
    url: uri,
  });

  return createTRPCProxyClient<Router>({
    links: [wsLink({ client: wsClient })],
  } as CreateTRPCClientOptions<Router>);
}

export const trpc = () => {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && get(browserClient)) return get(browserClient);
  const client = createTRPCWebSocketClient<Router>();
  if (isBrowser) browserClient.set(client);

  const guest = window.location.pathname.slice(0, 6) == "/guest";
  startHeartbeat(guest);
  startSubscriptions(guest);
  return client;
};
