import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";
import { files } from "$lib/components/Input.svelte";
import { current } from "$lib/lib/UI";

export const load: LayoutLoad = async () => {
  if (browser && !localStorage.getItem("loggedIn")) {
    throw redirect(307, "/setup");
  }

  // Receive file from service-worker
  window.addEventListener("load", async () => {
    if (location.search.includes("share-target")) {
      const keys = await caches.keys();
      const mediaCache = await caches.open(
        keys.filter((key) => key.startsWith("media"))[0],
      );
      const responseArray = await mediaCache.matchAll("shared-file");
      if (responseArray) {
        const fileArray = new FileList();

        for (let i = 0; i < responseArray.length; i++) {
          fileArray[i] = await responseArray[i].blob() as File;
        }

        files.set(fileArray);
        current.set("Home");

        await mediaCache.delete("shared-file");
      }
    }
  });
};
