import {
  split,
  HttpLink,
  InMemoryCache,
  ApolloClient,
  type NormalizedCacheObject,
} from "@apollo/client/core";
import { getMainDefinition } from "@apollo/client/utilities";
import { WebSocketLink } from "@apollo/client/link/ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { PUBLIC_DGRAPH_HTTP, PUBLIC_DGRAPH_WS } from "$env/static/public";
import { getClient, setClient } from "svelte-apollo";
import { writable, type Writable } from "svelte/store";
import { browser } from "$app/environment";
import { getLinkedDeviceDocument } from "$lib/gql";

export let apolloClient: Writable<ApolloClient<NormalizedCacheObject> | null> =
  writable(null);

export function createApolloClient(jwt: string | null) {
  if (!jwt) return;
  const headers = {
    Authorization: `Bearer ${jwt}`,
  };

  const httpLink = new HttpLink({
    uri: new URL("/graphql", PUBLIC_DGRAPH_HTTP).href,
    headers,
  });

  const wsLink = new WebSocketLink(
    new SubscriptionClient(new URL("/graphql", PUBLIC_DGRAPH_WS).href, {
      reconnect: true,
      lazy: true,
      connectionParams: {
        headers,
      },
    })
  );

  const link = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    httpLink
  );

  const cache = new InMemoryCache();

  const client = new ApolloClient({
    link,
    cache,
  });

  // test client and return null if not connected
  client.query({
    query: getLinkedDeviceDocument,
  }).then((res) => {
    res.data.getDevice?.id;
  })

  return client;
}
