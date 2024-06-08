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

import { getDicebearUrl } from "../../common/common";

precacheAndRoute(self.__WB_MANIFEST);

pageCache();

googleFontsCache();

staticResourceCache();

imageCache();

type notificationData = {
  username: string;
  avatarSeed: string;
  did: number;
  nid: string;
  files: string[];
};

self.addEventListener("push", async (event) => {
  if (event.data === null) return;
  const data: notificationData = event.data.json();

  self.registration.showNotification("Sharing request", {
    data,
    body: `${data.username} wants to share the file${data.files.length > 1 ? "s" : ""} '${data.files.toString()}' with you. Click to accept.`,
    icon: getDicebearUrl(data.avatarSeed),
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data: notificationData = event.notification.data;

  event.waitUntil(
    self.clients.openWindow(`/?accept-target&did=${data.did}&nid=${data.nid}`),
  );
});

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
  const resolvers = nextMessageResolveMap.get(event.data);
  if (!resolvers) return;
  nextMessageResolveMap.delete(event.data);
  for (const resolve of resolvers) resolve();
});

// Activate service worker
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
