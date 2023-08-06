import { get } from "svelte/store";
import {
  chunkFiles,
  connected,
  connections,
  peer,
  pending_filetransfers,
} from "./common";
import { handleData } from "./main";
import { encryptFiles, encryptFilesWithPassword } from "$lib/lib/openpgp";
import { nanoid } from "nanoid";
import { own_did } from "$lib/lib/UI";

// Sender:
export const send = async (
  files: FileList,
  cid?: string,
  did?: number,
  peerID?: string,
  publicKey?: string,
) => {
  if (files) {
    let filetransfer_infos: {
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
      did?: number,
    };

    let encrypted_files: string[];
    if (publicKey !== undefined) {
      encrypted_files = await encryptFiles(files, publicKey);
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
      encrypted_files = await encryptFilesWithPassword(files, filetransfer_id);
      filetransfer_infos = {
        filetransfer_id,
        encrypted: "password",
        completed: false,
        files: chunkFiles(files, encrypted_files),
        cid,
        did,
      };
    }

    pending_filetransfers.set([
      ...get(pending_filetransfers),
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
  const pending_filetransfer = get(pending_filetransfers).find(
    (pending_filetransfer) =>
      pending_filetransfer.filetransfer_id == filetransfer_id
  );

  if (pending_filetransfer !== undefined) {
    const files: {
      file_name: string;
      file_id: string;
      chunk_number: number;
    }[] = [];

    pending_filetransfer.files.forEach((file) => {
      files.push({
        file_name: file.file_name,
        file_id: file.file_id,
        chunk_number: file.file.length,
      });
    });

    const connect_return = connected(peerID);
    if (connect_return == false) {
      const conn = get(peer).connect(peerID);

      conn.on("open", async function () {
        if (pending_filetransfer !== undefined) {
          conn.send({
            type: "Request",
            did: await get(own_did),
            filetransfer_id: pending_filetransfer.filetransfer_id,
            encrypted: pending_filetransfer.encrypted,
            files,
          });
        }
      });

      conn.on("data", function (received_data) {
        handleData(received_data, conn);
      });

      connections.set([...get(connections), conn]);
    } else {
      connect_return.send({
        type: "Request",
        did: await get(own_did),
        filetransfer_id: pending_filetransfer.filetransfer_id,
        encrypted: pending_filetransfer.encrypted,
        files,
      });
    }
  } else {
    console.log("PeerJS: Wrong filetransfer id.");
  }
};

export const sendChunk = (
  peerID: string,
  filetransfer_id: string,
  chunk_info?: {
    file_id: string;
    chunk_id: number;
    chunk: string;
  }
) => {
  let initial_chunk_info: {
    file_id: string;
    chunk_id: number;
    chunk: string;
  } | undefined;

  if (chunk_info === undefined) {
    get(pending_filetransfers).forEach((pending_filetransfer) => {
      if (pending_filetransfer.filetransfer_id == filetransfer_id) {
        initial_chunk_info = {
          file_id: pending_filetransfer.files[0].file_id,
          chunk_id: 0,
          chunk: pending_filetransfer.files[0].file[0]
        };
      }
    });

    if (initial_chunk_info === undefined) {
      console.log("PeerJS: Filetransfer not found.");
    }
  }

  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID);

    conn.on("open", function () {
      if (chunk_info !== undefined) {
        conn.send({
          type: "Chunk",
          filetransfer_id: filetransfer_id,
          chunk_info,
        });
      } else if (initial_chunk_info !== undefined) {
        conn.send({
          type: "Chunk",
          filetransfer_id: filetransfer_id,
          chunk_info: initial_chunk_info,
        });
      }
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  } else {
    if (chunk_info !== undefined) {
      connect_return.send({
        type: "Chunk",
        filetransfer_id: filetransfer_id,
        chunk_info,
      });
    } else if (initial_chunk_info !== undefined) {
      connect_return.send({
        type: "Chunk",
        filetransfer_id: filetransfer_id,
        chunk_info: initial_chunk_info,
      });
    }
  }
};

export const sendFinish = (
  peerID: string,
  file_id: string,
  filetransfer_id?: string
) => {
  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "FileFinished",
        file_id: file_id,
      });

      if (filetransfer_id !== undefined) {
        conn.send({
          type: "FiletransferFinished",
          file_id: file_id,
        });
      }
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  } else {
    connect_return.send({
      type: "FileFinished",
      file_id: file_id,
    });

    if (filetransfer_id !== undefined) {
      connect_return.send({
        type: "FiletransferFinished",
        filetransfer_id: filetransfer_id,
      });

      pending_filetransfers.update((filetransfers) =>
        filetransfers.filter((filetransfer) => filetransfer.filetransfer_id != filetransfer_id)
      );
    }
  }
};

// Receiver:
export const sendAccept = (peerID: string, filetransfer_id: string) => {
  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "Accept",
        filetransfer_id,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  } else {
    connect_return.send({
      type: "Accept",
      filetransfer_id,
    });
  }
};

export const sendChunkFinish = (
  peerID: string,
  filetransfer_id: string,
  chunk_id: number,
  file_id: string
) => {
  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "ChunkFinished",
        filetransfer_id: filetransfer_id,
        chunk_id,
        file_id,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  } else {
    connect_return.send({
      type: "ChunkFinished",
      filetransfer_id: filetransfer_id,
      chunk_id,
      file_id,
    });
  }
};