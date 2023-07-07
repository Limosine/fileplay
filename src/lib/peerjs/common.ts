import { nanoid } from "nanoid";
import type { DataConnection, Peer } from "peerjs";
import { get, writable } from "svelte/store";

// Stores:
export const peer = writable<Peer>();
export const sender_uuid = writable<string>();
export const connections = writable<DataConnection[]>([]);

// Sender Side:
export let pending_filetransfers = writable<
  {
    filetransfer_id: string,
    encrypted: string,
    completed: boolean,
    files: {
      file: string[],
      chunks: number,
      file_name: string,
      file_id: string,
    }[],
    cid?: string,
  }[]
>([]);

// Receiver Side:
export const received_chunks = writable<
  {
    file_id: string;
    file_name: string;
    encrypted: string;
    chunk_number: number;
    chunks: string[];
    url?: string;
  }[]
>([]);
export const link = writable("");

// Functions:

export function connected(receiver_uuid: string): DataConnection | false {
  let conn: DataConnection;
  for (conn of get(connections)) {
    if (conn.peer == receiver_uuid) return conn;
  }

  return false;
}

export const createFileURL = (file: any) => {
  var blob = new Blob([file]);
  var url = URL.createObjectURL(blob);
  return url;
};

// Chunking:

export const chunkString = (str: string, size: number) => {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substring(o, o + size);
  }

  return chunks;
};

export const chunkFiles = (files: FileList, encrypted_files: string[]) => {
  let chunkedFiles: { file: string[], chunks: number, file_name: string, file_id: string; }[] =
    [];

  for (let i = 0; i < encrypted_files.length; i++) {
    chunkedFiles.push({
      file: chunkString(encrypted_files[i], 1000000),
      chunks: 0,
      file_name: files[i].name,
      file_id: nanoid(16),
    });
  }

  return chunkedFiles;
};
