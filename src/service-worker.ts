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

importScripts('https://unpkg.com/dexie@3.0.3/dist/dexie.js');

interface IndexedDBFileTable {
  id?: number;
  name: string;
  content: Blob;
}

// Declare the Dexie class with types
declare class Dexie {
  constructor(databaseName: string);
  version(versionNumber: number): any;
}

// Declare the Table class with types
declare class Table<T> {
  add(item: T): Promise<number>;
  get(id: number): Promise<T | undefined>;
  // Add more methods as needed for your use case
}

class IndexedDBFileTableSubClass extends Dexie {
  indexedFBFileTable!: Table<IndexedDBFileTable>;

  constructor() {
    super("fileDatabase");
    this.version(1).stores({
      indexedFBFileTable: "++id, name, content"
    });
  }
}



const idb = new IndexedDBFileTableSubClass();

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
