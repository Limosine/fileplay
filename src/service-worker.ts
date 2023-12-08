/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { files } from "../src/lib/components/Input.svelte";
import { current } from "../src/lib/lib/UI";

import {
  pageCache,
  imageCache,
  staticResourceCache,
  googleFontsCache,
} from "workbox-recipes";
import { precacheAndRoute } from "workbox-precaching";

// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

self.addEventListener("fetch", async (event: any) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/webtarget") {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const fileArray = formData.getAll("files") as FileList;
        current.set("Home");
        files.set(fileArray);

        return Response.redirect("/", 303);
      })()
    );
  }
});
