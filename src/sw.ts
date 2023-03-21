/// <reference lib="webworker" />


import { openDB } from "idb";

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST);

// clean old assets
cleanupOutdatedCaches();

let allowlist: undefined | RegExp[];
if (import.meta.env.DEV) allowlist = [/^\/$/];

// to allow work offline
// registerRoute(new NavigationRoute(createHandlerBoundToURL("/"), { allowlist }));


self.addEventListener("fetch", async (event) => {
if (event.request.method === "POST") {
    const url = new URL(event.request.url);
    if (url.pathname === "/handle") {
      console.log("Handling POST request in sw")
      event.respondWith(
        (async () => {
          const formData = await event.request.formData();
          const files = formData.getAll("files") as File[];

          const db = await openDB("files", 1, {
            upgrade: (db) =>
              db.createObjectStore("files", {
                // The 'id' property of the object will be the key.
                keyPath: "id",
                // If it isn't explicitly set, create a value by auto incrementing.
                autoIncrement: true,
              }),
          });
          for (const file of files) {
            await db.add("files", file);
          }
          db.close();

          return Response.redirect("/show", 303);
        })()
      );
    }
  }
});
