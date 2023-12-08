/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

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

self.addEventListener('fetch', (event: any) => {
  if (event.request.url.endsWith('/receive-files/') && event.request.method === 'POST') {
    return event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const fileArray = formData.getAll("file") as Array<File>;
        const keys = await caches.keys();
        const mediaCache = await caches.open(keys.filter((key) => key.startsWith('media'))[0]);

        fileArray.forEach(async file => {
          await mediaCache.put('shared-file', new Response(file));
        });

        return Response.redirect('./?share-target', 303);
      })(),
    );
  }
});
