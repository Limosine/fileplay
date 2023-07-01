import { get } from "svelte/store";
import { chunkFiles, connected, connections, peer, pending_filetransfers } from "./common";
import { handleData } from "./main";
import { encryptFiles, encryptFilesWithPassword } from "$lib/openpgp";
import { nanoid } from "nanoid";

export const sendInfos = (
  peerID: string,
  filetransfer_id: string
) => {
  let pending_filetransfer = get(pending_filetransfers).find(pending_filetransfer => pending_filetransfer.filetransfer_id == filetransfer_id);

  if (pending_filetransfer !== undefined) {
    let files: {
      file_name: string,
      file_id: string,
      chunk_number: number;
    }[] = [];

    pending_filetransfer.files.forEach((file) => {
      files.push({
        file_name: file.file_name,
        file_id: file.file_id,
        chunk_number: file.file.length
      });
    });

    let connect_return = connected(peerID);
    if (connect_return == false) {

      let conn = get(peer).connect(peerID);

      conn.on("open", function () {
        if (pending_filetransfer !== undefined) {
          conn.send({
            type: "FileInfos",
            filetransfer_id: pending_filetransfer.filetransfer_id,
            encrypted: pending_filetransfer.encrypted,
            files
          });
        }
      });

      conn.on("data", function (received_data) {
        handleData(received_data, conn);
      });

      connections.set([...get(connections), conn]);
    } else {
      connect_return.send({
        type: "FileInfos",
        filetransfer_id: pending_filetransfer.filetransfer_id,
        encrypted: pending_filetransfer.encrypted,
        files
      });
    }
  } else {
    console.log("Wrong filetransfer id.");
  }
};

export const sendAccept = (peerID: string, filetransfer_id: string) => {

  let connect_return = connected(peerID);
  if (connect_return == false) {

    let conn = get(peer).connect(peerID);

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

export const sendRequest = (
  filetransfer_id: string,
  peerID: string,
) => {
  let connect_return = connected(peerID);
  if (connect_return == false) {

    let conn = get(peer).connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "Request",
        filetransfer_id: filetransfer_id,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  } else {
    connect_return.send({
      type: "Request",
      filetransfer_id: filetransfer_id,
    });
  }
};


export const sendChunkRequest = (
  peerID: string,
  filetransfer_id: string,
  chunk_id: number,
  file_id: string
) => {
  let connect_return = connected(peerID);
  if (connect_return == false) {

    let conn = get(peer).connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "ChunkRequest",
        filetransfer_id: filetransfer_id,
        chunk_id,
        file_id
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  } else {
    connect_return.send({
      type: "ChunkRequest",
      filetransfer_id: filetransfer_id,
      chunk_id,
      file_id
    });
  }
};

export const sendChunked = (
  peerID: string,
  filetransfer_id: string,
  chunk_id: number,
  file_id?: string,
) => {

  let chunk_info: {
    file_id: string,
    chunk_id: number,
    chunk: string;
  } | undefined;
  let file_finished: string | undefined;

  get(pending_filetransfers).forEach((pending_filetransfer) => {
    if (pending_filetransfer.filetransfer_id == filetransfer_id) {
      if (file_id === undefined) {
        chunk_info = {
          file_id: pending_filetransfer.files[0].file_id,
          chunk_id: chunk_id,
          chunk: pending_filetransfer.files[0].file[chunk_id]
        };
      }
      pending_filetransfer.files.forEach((pending_file) => {
        if (pending_file.file_id == file_id) {
          if (chunk_id < pending_file.file.length) {
            chunk_info = {
              file_id: pending_file.file_id,
              chunk_id: chunk_id,
              chunk: pending_file.file[chunk_id]
            };
          } else {
            file_finished = pending_file.file_id;
            let index = pending_filetransfer.files.indexOf(pending_file) + 1;

            if (index < pending_filetransfer.files.length) {
              let file = pending_filetransfer.files[index];
              chunk_info = {
                file_id: file.file_id,
                chunk_id: 0,
                chunk: file.file[0]
              };
            }
          }
        }
      });
    }
  });

  let connect_return = connected(peerID);
  if (connect_return == false) {

    let conn = get(peer).connect(peerID);

    conn.on("open", function () {
      if (file_finished !== undefined) {
        conn.send({
          type: "FileFinished",
          file_id: file_finished
        });
      }
      if (chunk_info !== undefined) {
        conn.send({
          type: "Chunk",
          filetransfer_id: filetransfer_id,
          chunk_info,
        });
      }
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  } else {
    if (file_finished !== undefined) {
      connect_return.send({
        type: "FileFinished",
        file_id: file_finished
      });
    }
    if (chunk_info !== undefined) {
      connect_return.send({
        type: "Chunk",
        filetransfer_id: filetransfer_id,
        chunk_info,
      });
    }
  }
};

export const send = async (
  files: FileList,
  peerID?: string,
  publicKey?: string
) => {
  if (files) {

    let filetransfer_infos: {
      filetransfer_id: string,
      encrypted: string,
      files: {
        file: string[],
        file_name: string,
        file_id: string,
      }[];
    };

    let encrypted_files: string[];
    if (publicKey !== undefined) {
      encrypted_files = await encryptFiles(files, publicKey);
      filetransfer_infos = {
        filetransfer_id: nanoid(16),
        encrypted: "publicKey",
        files: chunkFiles(files, encrypted_files),
      };
    } else {
      let filetransfer_id = nanoid(16);
      encrypted_files = await encryptFilesWithPassword(files, filetransfer_id);
      filetransfer_infos = {
        filetransfer_id,
        encrypted: "password",
        files: chunkFiles(files, encrypted_files),
      };
    }

    pending_filetransfers.set([...get(pending_filetransfers), filetransfer_infos]);

    if (peerID !== undefined) {
      sendRequest(filetransfer_infos.filetransfer_id, peerID);
    } else {
      return filetransfer_infos.filetransfer_id;
    }
  }
};