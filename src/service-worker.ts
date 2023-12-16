/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

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

self.addEventListener("fetch", (event: any) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "POST" || url.pathname !== "/share"
  ) {
    return;
  }
  
  event.respondWith(
    (async () => {
	  // Get the data from the submitted form.
	  const formData = await event.request.formData() as FormData;
    console.log(formData);
	  const files = formData.getAll("files");
  
	  // Add files to cache.
    const cache = await caches.open("shared-files");
    files.forEach(async file => {
      await cache.put('shared-file', new Response(file));
    });

    await cache.put('formData', new Response(formData));
  
	  // Redirect the user to a URL that shows the imported files.
	  return Response.redirect("/shared", 303);
	})(),
  );
});
