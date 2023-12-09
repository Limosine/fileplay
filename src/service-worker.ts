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
import { idb } from "../src/swIndexedDB.ts";
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

async function addFileToIDB(file: File) {
  const blob = new Blob([file], { type: file.type });
  await idb.indexedFBFileTable.add({
    name: file.name,
    content: blob,
  });
}

self.addEventListener("fetch", (event: any) => {
  if (
    event.request.url.endsWith("/receive-files/") &&
    event.request.method === "POST"
  ) {
    return event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const fileArray = formData.getAll("file") as Array<File>;

        await Promise.all(
          fileArray.map(async (file) => {
            await addFileToIDB(file);
          }),
        );

        return Response.redirect("./?share-target", 303);
      })(),
    );
  }
});
