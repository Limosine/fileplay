import {
  split,
  HttpLink,
  InMemoryCache,
  ApolloClient,
} from "@apollo/client/core";
import { getMainDefinition } from "@apollo/client/utilities";
import { WebSocketLink } from "@apollo/client/link/ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { PUBLIC_DGRAPH_HTTP, PUBLIC_DGRAPH_WS } from "$env/static/public";

export function createApolloClient(jwt: string) {
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

  return client;
}
