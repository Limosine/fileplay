/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { openDB } from "idb";

const sw = self as unknown as ServiceWorkerGlobalScope;

/*
import { build, files, version } from "$service-worker";

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
  ...build, // the app itsw
  ...files, // everything in `static`
];

const ingested = [];

sw.addEventListener("install", (event) => {
  // Create a new cache and add all files to it
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
  sw.clients.claim();
});

*/

sw.addEventListener("fetch", async (event) => {
  // ignore POST requests etc
  /*if (event.request.method === "GET") {
    async function respond() {
      const url = new URL(event.request.url);
      const cache = await caches.open(CACHE);

      // `build`/`files` can always be served from the cache
      if (ASSETS.includes(url.pathname)) {
        return cache.match(event.request);
      }

      // for everything else, try the network first, but
      // fall back to the cache if we're offline
      try {
        const response = await fetch(event.request);

        if (response.status === 200) {
          cache.put(event.request, response.clone());
        }

        return response;
      } catch {
        return cache.match(event.request);
      }
    }

    event.respondWith(respond() as Promise<Response>);
  } else*/ if (event.request.method === "POST") {
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
