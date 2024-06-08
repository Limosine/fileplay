import dayjs from "dayjs";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { get, writable } from "svelte/store";

interface HistoryDB extends DBSchema {
  shared: {
    value: {
      type: "contact" | "group" | "device";
      id: number;
      timestamp: number;
      counter: number;
    };
    key: number;
    indexes: { "by-timestamp": number; "by-counter": number };
  };
}

const database = writable<IDBPDatabase<HistoryDB>>();

const openDatabase = async () => {
  if (get(database) === undefined) {
    const db = await openDB<HistoryDB>("history", 1, {
      upgrade(db) {
        const store = db.createObjectStore("shared", {
          keyPath: ["type", "id"],
        });

        store.createIndex("by-timestamp", "timestamp", {
          unique: false,
        });
        store.createIndex("by-counter", "counter", {
          unique: false,
        });
      },
    });

    database.set(db);
    return db;
  } else return get(database);
};

export const clearObjectStores = async () => {
  const db = await openDatabase();

  for (const store of db.objectStoreNames) {
    await db.clear(store);
  }
};

export const deleteHistory = async (
  mode: "contact" | "group" | "device",
  id: number,
) => {
  const db = await openDatabase();

  db.delete("shared", IDBKeyRange.only([mode, id]));
};

export const increaseCounter = async (
  mode: "contact" | "group" | "device",
  id: number,
) => {
  const db = await openDatabase();

  const result = await db.get("shared", IDBKeyRange.only([mode, id]));

  await db.put("shared", {
    type: mode,
    id,
    timestamp: dayjs().unix(),
    counter: result === undefined ? 1 : ++result.counter,
  });
};

export const getTimestamp = async (
  mode: "contact" | "group" | "device",
  id: number,
) => {
  const db = await openDatabase();

  const result = await db.get("shared", IDBKeyRange.only([mode, id]));

  if (result === undefined) return undefined;
  else return result.timestamp;
};

export const getFrequently = async () => {
  const db = await openDatabase();

  const store = db.transaction("shared", "readonly").objectStore("shared");
  let cursor = await store.index("by-counter").openCursor(null, "prev");

  const result = [];

  while (cursor && result.length < 3) {
    result.push(cursor.value);

    cursor = await cursor.continue();
  }

  return result;
};

export const getRecently = async () => {
  const db = await openDatabase();

  const store = db.transaction("shared", "readonly").objectStore("shared");
  let cursor = await store.index("by-timestamp").openCursor(null, "prev");

  const result = [];

  while (cursor) {
    result.push(cursor.value);

    cursor = await cursor.continue();
  }

  return result;
};
