import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { setClient } from "svelte-apollo";
import { createApolloClient } from "$lib/db";

export const ssr = false; // disable ssr for localStorage access during load function

export const load = async ({ url, fetch }) => {
  if (browser && url.pathname !== "/onboard") {
    let jwt = localStorage.getItem("jwt");
    if (!jwt) {
      throw redirect(302, "/onboard");
    }

    setClient(createApolloClient(jwt));
  }

  const { pathname } = url;

  return {
    data: pathname,
  };
};
