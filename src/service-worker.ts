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
  // Only use this event listener for POST requests sent to /share-file-handler.
  const url = new URL(event.request.url);
  if (
    event.request.method !== "POST" ||
    url.pathname !== "/share-file-handler"
  ) {
    return;
  }
  
  event.respondWith(
    (async () => {
	  // Get the data from the submitted form.
	  const formData = await event.request.formData();
  
	  // Get the submitted files.
	  const files = formData.getAll("files");
  
	  // Send the files to the frontend app.
	  // sendFilesToFrontend(files);
  
	  // Redirect the user to a URL that shows the imported files.
	  return Response.redirect("/display-new-files", 303);
	})(),
  );
});

// self.addEventListener("fetch", (event: any) => {
//   if (
//     event.request.url.endsWith("/receive-files/") &&
//     event.request.method === "POST"
//   ) {
//     return event.respondWith(
//       (async () => {
//         const formData = await event.request.formData();
//         const fileArray = formData.getAll("file") as Array<File>;

//         await Promise.all(
//           fileArray.map(async (file) => {
//             await addFileToIDB(file);
//           }),
//         );

//         return Response.redirect("./?share-target", 303);
//       })(),
//     );
//   }
// });