import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async () => {
  if (browser && !localStorage.getItem("loggedIn")) {
    throw redirect(307, "/setup");
  }
};
