import { get, writable } from "svelte/store";
import {
  type CreateTRPCClientOptions,
  createTRPCProxyClient,
  createWSClient,
  wsLink,
} from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

import type { Router } from "$lib/trpc/router";

const browserClient =
  writable<ReturnType<typeof createTRPCWebSocketClient<Router>>>();

function createTRPCWebSocketClient<Router extends AnyRouter>(): ReturnType<
  typeof createTRPCProxyClient<Router>
  > {
  // @ts-ignore
  if (typeof location === "undefined") return;

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

export function trpc() {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && get(browserClient)) return get(browserClient);
  const client = createTRPCWebSocketClient<Router>();
  if (isBrowser) browserClient.set(client);
  return client;
}
