/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ /** @type {unknown} */ self;
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from "workbox-precaching";
import {
  pageCache,
  imageCache,
  staticResourceCache,
  googleFontsCache,
} from "workbox-recipes";

import { chunkFiles } from "$lib/sharing/common";

precacheAndRoute(self.__WB_MANIFEST);

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

const chunking = async (
  data: {
    id: string;
    files: FileList;
  },
  client: ExtendableMessageEvent["source"],
) => {
  const files = await chunkFiles(data.files);

  client!.postMessage({
    action: "chunked-files",
    data: {
      id: data.id,
      files,
    },
  });
};

// Following code from:
// https://github.com/GoogleChromeLabs/squoosh/blob/dev/src/sw/util.ts

const serveShareTarget = (event: FetchEvent) => {
  const formData = event.request.formData();
  event.respondWith(Response.redirect("/?share-target"));

  event.waitUntil(
    (async function () {
      await nextMessage("share-ready");
      const client = await self.clients.get(event.resultingClientId);

      client!.postMessage({
        data: (await formData).getAll("files"),
        action: "load-data",
      });
    })(),
  );
};

self.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (
    url.pathname === "/" &&
    url.searchParams.has("share-target") &&
    event.request.method === "POST"
  ) {
    serveShareTarget(event);
    return;
  }
});

const nextMessageResolveMap = new Map<string, (() => void)[]>();

const nextMessage = (dataVal: string) => {
  return new Promise<void>((resolve) => {
    if (!nextMessageResolveMap.has(dataVal)) {
      nextMessageResolveMap.set(dataVal, []);
    }
    nextMessageResolveMap.get(dataVal)!.push(resolve);
  });
};

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  // Event handler
  if (typeof event.data == "object") {
    if (event.data.action == "chunk-files") {
      chunking(event.data, event.source);
    }
  }

  const resolvers = nextMessageResolveMap.get(event.data);
  if (!resolvers) return;
  nextMessageResolveMap.delete(event.data);
  for (const resolve of resolvers) resolve();
});
