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
import type { DataConnection } from "peerjs";
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

    const sendData = async (connection: DataConnection) => {
      connection.send({
        type: "Request",
        did: await get(own_did),
        filetransfer_id: outgoing_filetransfer.filetransfer_id,
        encrypted: outgoing_filetransfer.encrypted,
        files,
      });
    };

    const connect_return = connected(peerID);
    if (connect_return == false) {
      const conn = get(peer).connect(peerID, {});

      conn.on("open", async function () {
        sendData(conn);
      });

      addListeners(conn);
    } else {
      sendData(connect_return);
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

  const sendData = async (connection: DataConnection) => {
    if (chunk_info !== undefined) {
      connection.send({
        type: "Chunk",
        did: await get(own_did),
        filetransfer_id: filetransfer_id,
        chunk_info,
      });
    } else if (initial_chunk_info !== undefined) {
      connection.send({
        type: "Chunk",
        did: await get(own_did),
        filetransfer_id: filetransfer_id,
        chunk_info: initial_chunk_info,
      });
    }
  };

  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      sendData(conn);
    });

    addListeners(conn);
  } else {
    sendData(connect_return);
  }
};

export const sendFinish = async (
  peerID: string,
  filetransfer_id: string,
  file_id: string,
  filetransfer_finished: boolean,
) => {
  const sendData = async (connection: DataConnection) => {
    connection.send({
      type: "FileFinished",
      did: await get(own_did),
      filetransfer_id,
      file_id,
    });

    if (filetransfer_finished) {
      connection.send({
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
  };

  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      sendData(conn);
    });

    addListeners(conn);
  } else {
    sendData(connect_return);
  }
};

// Receiver:
export const sendAccept = async (peerID: string, filetransfer_id: string) => {
  const sendData = async (connection: DataConnection) => {
    connection.send({
      type: "Accept",
      did: await get(own_did),
      filetransfer_id,
    });
  };

  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      sendData(conn);
    });

    addListeners(conn);
  } else {
    sendData(connect_return);
  }
};

export const sendChunkFinish = async (
  peerID: string,
  filetransfer_id: string,
  chunk_id: number,
  file_id: string,
) => {
  const sendData = async (connection: DataConnection) => {
    connection.send({
      type: "ChunkFinished",
      did: await get(own_did),
      filetransfer_id,
      file_id,
      chunk_id,
    });
  };

  const connect_return = connected(peerID);
  if (connect_return == false) {
    const conn = get(peer).connect(peerID, {});

    conn.on("open", async function () {
      sendData(conn);
    });

    addListeners(conn);
  } else {
    sendData(connect_return);
  }
};
