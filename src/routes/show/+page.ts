import type { PageLoad } from "./$types";
import { openDB } from "idb";

export const ssr = false;

export const load: PageLoad = async () => {
  const db = await openDB("files");
  const files = await db.getAll("files") as File[];
  db.close();
  return {
    files
  }
};
