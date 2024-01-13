import { nanoid } from "nanoid";
import { writable } from "svelte/store";

// Types:
export interface Chunk {
  type: "chunk";
  id: string;
  chunk: {
    id: number;
    file_id: string;
    data: string;
  };
  final?: boolean;
  did: number;
}
export interface FileFinished {
  type: "file-finish";
  id: string;
  file_id: string;
  missing?: number[];
  did: number;
}
export interface FiletransferFinished {
  type: "transfer-finish";
  id: string;
  did: number;
}
export interface Accept {
  type: "accept";
  id: string;
  guest?: boolean;
  did?: number;
}
export interface Request {
  type: "request";
  id: string;
  encrypted: "publicKey" | "password";
  files: Omit<Omit<Omit<FileInfos, "url">, "chunks">, "completed">[];
  did: number;
}
export interface Error {
  type: "error";
  message: string;
}
export interface FileInfos {
  id: string;
  name: string;
  chunks_length: number;
  chunks: string[];
  completed: number;
  url?: string; // generated at the end
}
export interface OutgoingFileTransfer {
  id: string;
  encrypted: "password" | "publicKey";
  completed: boolean;
  files: Omit<FileInfos, "url">[];
  did?: number; // not always defined (--> via link)
  cid?: number;
}
export interface IncomingFiletransfer {
  id: string;
  encrypted: "password" | "publicKey";
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

export const chunkFiles = (files: FileList, encrypted_files: string[]) => {
  const chunkedFiles: OutgoingFileTransfer["files"] = [];

  for (let i = 0; i < encrypted_files.length; i++) {
    const array = chunkString(encrypted_files[i], 16 * 1024);
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
