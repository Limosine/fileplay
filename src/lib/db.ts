import { split, HttpLink, InMemoryCache, ApolloClient } from "@apollo/client/core";
import { getMainDefinition } from "@apollo/client/utilities";
import { WebSocketLink } from "@apollo/client/link/ws";
import { SubscriptionClient } from "subscriptions-transport-ws";
import {
  PUBLIC_DGRAPH_HTTP_URL,
  PUBLIC_DGRAPH_WS_URL,
} from "$env/static/public";
import { setClient } from "svelte-apollo";

export function connect(jwt: string) {
  const headers = {
    Authorization: `Bearer ${jwt}`,
  };

  const httpLink = new HttpLink({
    uri: PUBLIC_DGRAPH_HTTP_URL,
    headers,
  });

  const wsLink = new WebSocketLink(
    new SubscriptionClient(PUBLIC_DGRAPH_WS_URL, {
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

  setClient(client);
}

