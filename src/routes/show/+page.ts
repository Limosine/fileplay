import type { PageLoad } from "./$types";
import { openDB } from "idb";

export const load: PageLoad = async () => {
  const db = await openDB("files");
  const files = await db.getAll("files") as File[];
  await db.delete("files", IDBKeyRange.lowerBound(0));
  db.close();
  return {
    files
  }
};
