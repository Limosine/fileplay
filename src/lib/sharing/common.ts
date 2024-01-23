import { blobToArrayBuffer } from "$lib/lib/utils";
import { nanoid } from "nanoid";
import { writable } from "svelte/store";

// Types:
export type webRTCData =
  | Update
  | Chunk
  | FileFinished
  | FiletransferFinished
  | Accept
  | Request
  | Error;

export interface Update {
  type: "update";
  key: JsonWebKey;
}
export interface Chunk {
  type: "chunk";
  id: string;
  chunk: {
    id: number;
    file_id: string;
    data: Uint8Array;
  };
  final?: boolean;
}
export interface FileFinished {
  type: "file-finish";
  id: string;
  file_id: string;
  missing?: number[];
}
export interface FiletransferFinished {
  type: "transfer-finish";
  id: string;
}
export interface Accept {
  type: "accept";
  id: string;
  guest?: boolean;
}
export interface Request {
  type: "request";
  id: string;
  files: Omit<Omit<Omit<FileInfos, "url">, "chunks">, "completed">[];
  previous?: string;
}
export interface Error {
  type: "error";
  message: string;
}
export interface FileInfos {
  id: string;
  name: string;
  chunks_length: number;
  chunks: Uint8Array[];
  completed: number;
  url?: string; // generated at the end
}
export interface OutgoingFileTransfer {
  id: string;
  completed: boolean;
  files: Omit<FileInfos, "url">[];
  did?: number;
  cid?: number; // not always defined (--> via link)
}
export interface IncomingFiletransfer {
  id: string;
  completed: boolean;
  files: Omit<FileInfos, "completed">[];
  did: number;
  cid?: number; // no access to cid on guest page
}

// Sender Side:
export const outgoing_filetransfers = writable<OutgoingFileTransfer[]>([]);
export const link = writable("");

// Receiver Side:
export const incoming_filetransfers = writable<IncomingFiletransfer[]>([]);
export const senderLink = writable("");

// Functions:
export const createFileURL = (file: any) => {
  const blob = new Blob([file]);
  const url = URL.createObjectURL(blob);
  return url;
};

// Chunking:
export const chunkString = (str: string, size: number) => {
  const numChunks = Math.ceil(str.length / size);
  const chunks: string[] = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substring(o, o + size);
  }

  return chunks;
};

export const chunkUint8Array = (array: Uint8Array, size: number) => {
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
};

export const chunkFiles = async (files: FileList) => {
  const chunkedFiles: OutgoingFileTransfer["files"] = [];

  for (let i = 0; i < files.length; i++) {
    const array = chunkUint8Array(
      new Uint8Array(await blobToArrayBuffer(files[i])),
      16 * 1024,
    );
    chunkedFiles.push({
      id: nanoid(),
      name: files[i].name,
      chunks_length: array.length,
      chunks: array,
      completed: 0,
    });
  }

  return chunkedFiles;
};

export const concatArrays = (arrays: Uint8Array[]) => {
  let length = 0;
  arrays.forEach((item) => {
    length += item.length;
  });

  const merged = new Uint8Array(length);
  let offset = 0;
  arrays.forEach((item) => {
    merged.set(item, offset);
    offset += item.length;
  });

  return merged;
};
