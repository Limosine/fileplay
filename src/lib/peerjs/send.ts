import { get } from "svelte/store";
import {
  addListeners,
  chunkFiles,
  connected,
  peer,
  outgoing_filetransfers,
} from "./common";
import { encryptFiles, encryptFilesWithPassword } from "$lib/lib/openpgp";
import { nanoid } from "nanoid";
import { own_did } from "$lib/lib/UI";

// Sender:
export const send = async (
  files: FileList,
  cid?: number,
  did?: number,
  peerID?: string,
  publicKey?: string,
) => {
  if (files) {
    let filetransfer_infos: IOutgoingFileTransfer;

    let encrypted_files: string[];
    if (publicKey !== undefined) {
      encrypted_files = (await encryptFiles(files, publicKey)).map((file) =>
        file.toString(),
      );
      filetransfer_infos = {
        filetransfer_id: nanoid(16),
        encrypted: "publicKey",
        completed: false,
        files: chunkFiles(files, encrypted_files),
        cid,
        did,
      };
    } else {
      const filetransfer_id = nanoid(16);
      encrypted_files = (
        await encryptFilesWithPassword(files, filetransfer_id)
      ).map((file) => file.toString());
      filetransfer_infos = {
        filetransfer_id,
        encrypted: "password",
        completed: false,
        files: chunkFiles(files, encrypted_files),
        cid,
        did,
      };
    }

    outgoing_filetransfers.set([
      ...get(outgoing_filetransfers),
      filetransfer_infos,
    ]);

    if (peerID !== undefined) {
      sendRequest(peerID, filetransfer_infos.filetransfer_id);
    } else {
      return filetransfer_infos.filetransfer_id;
    }
  }
};

export const sendRequest = async (peerID: string, filetransfer_id: string) => {
  const outgoing_filetransfer = get(outgoing_filetransfers).find(
    (outgoing_filetransfer) =>
      outgoing_filetransfer.filetransfer_id == filetransfer_id,
  );

  if (outgoing_filetransfer !== undefined) {
    const files: {
      file_name: string;
      file_id: string;
      chunk_number: number;
    }[] = [];

    outgoing_filetransfer.files.forEach((file) => {
      files.push({
        file_name: file.file_name,
        file_id: file.file_id,
        chunk_number: file.file.length,
      });
    });

    const connect_return = connected(peerID);
    if (connect_return == false) {
      const conn = get(peer).connect(peerID, {});

      conn.on("open", async function () {
        if (outgoing_filetransfer !== undefined) {
          conn.send({
            type: "Request",
            did: await get(own_did),
            filetransfer_id: outgoing_filetransfer.filetransfer_id,
            encrypted: outgoing_filetransfer.encrypted,
            files,
          });
        }
      });

      addListeners(conn);
    } else {
      connect_return.send({
        type: "Request",
        did: await get(own_did),
        filetransfer_id: outgoing_filetransfer.filetransfer_id,
        encrypted: outgoing_filetransfer.encrypted,
        files,
      });
    }
  } else {
    console.log("PeerJS: Wrong filetransfer id.");
  }
};

export const sendChunk = async (
  peerID: string,
  filetransfer_id: string,
  chunk_info?: {
    file_id: string;
    chunk_id: number;
    chunk: string;
  },
) => {
  let initial_chunk_info:
    | {
        file_id: string;
        chunk_id: number;
        chunk: string;
      }
    | undefined;

  if (chunk_info === undefined) {
    get(outgoing_filetransfers).forEach((outgoing_filetransfer) => {
      if (outgoing_filetransfer.filetransfer_id == filetransfer_id) {
        initial_chunk_info = {
          file_id: outgoing_filetransfer.files[0].file_id,
          chunk_id: 0,
          chunk: outgoing_filetransfer.files[0].file[0],
        };
      }
    });

    if (initial_chunk_info === undefined) {
      console.log("PeerJS: Filetransfer not found.");
    }
  }

  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      if (chunk_info !== undefined) {
        conn.send({
          type: "Chunk",
          did: await get(own_did),
          filetransfer_id: filetransfer_id,
          chunk_info,
        });
      } else if (initial_chunk_info !== undefined) {
        conn.send({
          type: "Chunk",
          did: await get(own_did),
          filetransfer_id: filetransfer_id,
          chunk_info: initial_chunk_info,
        });
      }
    });

    addListeners(conn);
  } else {
    if (chunk_info !== undefined) {
      connect_return.send({
        type: "Chunk",
        did: await get(own_did),
        filetransfer_id: filetransfer_id,
        chunk_info,
      });
    } else if (initial_chunk_info !== undefined) {
      connect_return.send({
        type: "Chunk",
        did: await get(own_did),
        filetransfer_id: filetransfer_id,
        chunk_info: initial_chunk_info,
      });
    }
  }
};

export const sendFinish = async (
  peerID: string,
  filetransfer_id: string,
  file_id: string,
  filetransfer_finished?: boolean,
) => {
  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      conn.send({
        type: "FileFinished",
        did: await get(own_did),
        filetransfer_id,
        file_id,
      });

      if (filetransfer_finished) {
        conn.send({
          type: "FiletransferFinished",
          did: await get(own_did),
          filetransfer_id,
          file_id,
        });
      }
    });

    addListeners(conn);
  } else {
    connect_return.send({
      type: "FileFinished",
      did: await get(own_did),
      filetransfer_id,
      file_id,
    });

    if (filetransfer_id !== undefined) {
      connect_return.send({
        type: "FiletransferFinished",
        did: await get(own_did),
        filetransfer_id,
        file_id,
      });

      const filetransfer = get(outgoing_filetransfers).find(
        (filetransfer) => filetransfer.filetransfer_id == filetransfer_id,
      );

      if (filetransfer !== undefined && filetransfer.cid !== undefined) {
        outgoing_filetransfers.update((filetransfers) =>
          filetransfers.filter(
            (filetransfer) => filetransfer.filetransfer_id != filetransfer_id,
          ),
        );
      }
    }
  }
};

// Receiver:
export const sendAccept = async (peerID: string, filetransfer_id: string) => {
  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      conn.send({
        type: "Accept",
        did: await get(own_did),
        filetransfer_id,
      });
    });

    addListeners(conn);
  } else {
    connect_return.send({
      type: "Accept",
      did: await get(own_did),
      filetransfer_id,
    });
  }
};

export const sendChunkFinish = async (
  peerID: string,
  filetransfer_id: string,
  chunk_id: number,
  file_id: string,
) => {
  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      conn.send({
        type: "ChunkFinished",
        did: await get(own_did),
        filetransfer_id,
        file_id,
        chunk_id,
      });
    });

    addListeners(conn);
  } else {
    connect_return.send({
      type: "ChunkFinished",
      did: await get(own_did),
      filetransfer_id,
      file_id,
      chunk_id,
    });
  }
};
