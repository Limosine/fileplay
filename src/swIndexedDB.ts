import Dexie, {type Table} from "dexie";

export interface IndexedDBFileTable {
  id?: number;
  name: string;
  content: Blob;
}

export class IndexedDBFileTableSubClass extends Dexie {
  indexedFBFileTable!: Table<IndexedDBFileTable>;

  constructor() {
    super("fileDatabase");
    this.version(1).stores({
      indexedFBFileTable: "++id, name, content"
    });
  }
}

export const idb = new IndexedDBFileTableSubClass();

