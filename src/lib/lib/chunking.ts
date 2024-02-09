import { openDB, deleteDB } from "idb";
import { get, writable } from "svelte/store";

const cleared = writable(false);

const open = async () => {
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB not supported.");
  }

  if (!get(cleared)) {
    cleared.set(true);
    await deleteDB("files");
  }

  return await openDB("files", 1);
};

// NOT WORKING!!!
export const createStore = async (id: number) => {
  const db = await open();

  if (!db.objectStoreNames.contains("file-" + id)) {
    const filesStore = db.createObjectStore("file-" + id, {
      keyPath: "id",
      autoIncrement: true,
    });

    filesStore.createIndex("chunk", "chunk", { unique: false });

    return true;
  }

  return false;
};

export const getFile = async (id: number) => {
  const db = await open();

  if (!(await createStore(id))) {
    throw new Error("No such file");
  }

  return await db.getAll("file-" + id);
};

export const addChunks = async (chunk: Uint8Array, id?: number) => {
  const db = await open();

  if (id !== undefined) {
    if (!(await createStore(id))) throw new Error("No such file");
  } else {
    const names = db.objectStoreNames;
    if (names.length === 0) id = 0;
    else id = Number(names[names.length - 1].slice(5)) + 1;
    await createStore(id);
  }

  db.add("file-" + id, chunk);

  return id;
};
