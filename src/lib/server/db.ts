import { Client, fetchExchange } from "@urql/core";
import { PUBLIC_DGRAPH_HTTP } from "$env/static/public";
import { SERVER_JWT } from "$env/static/private";

export async function createUrqlClient() {
  return new Client({
    url: new URL("/graphql", PUBLIC_DGRAPH_HTTP).href,
    exchanges: [fetchExchange],
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${SERVER_JWT}`,
      },
    },
  });
}
