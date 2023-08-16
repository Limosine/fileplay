import { get, writable } from "svelte/store";
import { nanoid } from "nanoid";
import type { DataConnection, Peer } from "peerjs";

import { handleData } from "./main";

// Stores:
export const peer = writable<Peer>();
export const peer_open = writable(false); // actual state
export const peer_disconnected = writable(false); // on purpose
export const sender_uuid = writable<string>();
export const connections = writable<DataConnection[]>([]);

// Sender Side:
export const outgoing_filetransfers = writable<IOutgoingFileTransfer[]>([]);
export const link = writable("");

// Receiver Side:
export const incoming_filetransfers = writable<IIncomingFiletransfer[]>([]);

// Functions:

export function connected(receiver_uuid: string): DataConnection | false {
  let conn: DataConnection;
  for (conn of get(connections)) {
    if (conn.peer == receiver_uuid) return conn;
  }

  return false;
}

export function addListeners(conn: DataConnection) {
  conn.on("data", function (received_data) {
    handleData(received_data, conn);
  });

  conn.on("close", () => {
    connections.update((connections) => connections.filter((connection) => connection.peer != conn.peer));
  });

  connections.set([...get(connections), conn]);
}

export const createFileURL = (file: any) => {
  const blob = new Blob([file]);
  const url = URL.createObjectURL(blob);
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
  const chunkedFiles: { file: string[], chunks: number, file_name: string, file_id: string; }[] =
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
