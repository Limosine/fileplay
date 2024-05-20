import { get } from "svelte/store";

import { files, updateFiles } from "$lib/lib/UI";
import { blobToArrayBuffer } from "$lib/lib/utils";

// Types:
export type webRTCData =
  | Update
  | Chunk
  | FileFinished
  | FiletransferFinished
  | Accept
  | Reject
  | Request
  | Ready
  | Error;

export interface Update {
  type: "update";
  key: JsonWebKey;
  id: 0 | 1;
  initiator?: true;
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
export interface Reject {
  type: "reject";
  id: string;
}
export interface Request {
  type: "request";
  id: string;
  ids: IncomingFiletransfer["ids"];
  files: Omit<Omit<IncomingFileInfos, "url">, "chunks">[];
  previous?: string;
  nid?: string;
}
export interface Ready {
  type: "ready";
  id: string;
}
export interface Error {
  type: "error";
  message: string;
}
export interface IncomingFileInfos {
  id: string;
  name: string;
  chunks_length: number;
  chunks: Uint8Array[];
  url?: string; // generated at the end
}
export interface OutgoingFileInfos {
  id: string;
  name: string;
  bigChunks: Blob[];
  small: {
    chunks_length: number;
    chunks?: Uint8Array[][];
  };
  completed: number;
}
export interface OutgoingFileTransfer {
  id: string;
  nid: string;
  files: OutgoingFileInfos[];
  ids:
    | {
        type: "group" | "contact";
        id: number;
      }
    | {
        type: "devices";
        ids: number[];
      }
    | {
        type: "fromGuest";
        id: number;
        previous: string;
      }
    | {
        type: "toGuest";
        transferId: string;
      };
  recipients: {
    state:
      | "requesting"
      | "rejected"
      | "sending"
      | "sent"
      | "canceled"
      | "failed";
    did: number;
    filesSent: number;
  }[];
}
export interface IncomingFiletransfer {
  id: string;
  did: number;
  files: IncomingFileInfos[];
  ids:
    | {
        type: "group" | "contact";
        id: number;
      }
    | {
        type: "device" | "guest";
      };
  state: "infos" | "receiving" | "received" | "failed";
}

// Functions:
export const createFileURL = (file: any) => {
  const blob = new Blob([file]);
  const url = URL.createObjectURL(blob);
  return url;
};

export const generateInfos = () => {
  // Split the files into large chunks (16000 KB)
  const fileInfos: OutgoingFileInfos[] = [];
  for (let i = 0; i < get(files).length; i++) {
    let bigChunks = get(files)[i].bigChunks;

    if (bigChunks === undefined) {
      bigChunks = chunkFileBig(get(files)[i].file);
      updateFiles((files) => {
        files[i].bigChunks = bigChunks;
        return files;
      });
    }

    fileInfos.push({
      id: get(files)[i].id,
      name: get(files)[i].file.name,
      bigChunks,
      small: {
        chunks_length: Math.ceil(get(files)[i].file.size / (16 * 1024)),
      },
      completed: 0,
    });
  }
  return fileInfos;
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

export const chunkFileBig = (file: File, size = 1000 * 16 * 1024) => {
  const chunks: Blob[] = [];
  let offset = 0;

  const totalChunks = Math.ceil(file.size / size);

  for (let i = 0; i < totalChunks; i++) {
    chunks.push(file.slice(offset, offset + size));
    offset += size;
  }

  return chunks;
};

export const chunkBlobSmall = async (blob: Blob) => {
  const uint8 = new Uint8Array(await blobToArrayBuffer(blob));

  return chunkUint8Array(uint8, 16 * 1024);
};

export function concatArrays<T>(arrays: T[][]): T[] {
  return new Array().concat(...arrays);
}

export const concatUint8Arrays = (arrays: Uint8Array[]) => {
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
