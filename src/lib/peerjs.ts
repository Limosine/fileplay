import { nanoid } from "nanoid";
import type { DataConnection } from "peerjs";
import Peer from "peerjs";
import { get, writable } from "svelte/store";
import { page } from "$app/stores";
import { addNotification, notifications } from "./stores/Dialogs";
import {
  decryptFiles,
  decryptFilesWithPassword,
  encryptFiles,
  encryptFilesWithPassword,
} from "./openpgp";

let peer: Peer;
export const sender_uuid = writable<string>();

let connections: DataConnection[] = [];

let pending_files: { listen_key: string; files: FileList; }[] = [];
export const link = writable("");
export const received_files = writable<{ url: string; name: string; }[]>([]);

const cachedChunks: { transferID: string; chunks: string[]; }[] = [];
const chunkIDs: { transferID: string; chunkIDs: string[]; }[] = [];

const openPeer = async (uuid?: string) => {
  if (uuid) {
    peer = new Peer(uuid);
  } else peer = new Peer();

  peer.on("open", (id) => {
    sender_uuid.set(id);
    console.log("Peer opened, PeerID: ", id);
  });
};

export const disconnectPeer = () => {
  peer.disconnect();
};

const listen = () => {
  peer.on("connection", (conn) => {
    connections.push(conn);

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });
  });
};

const handleData = (data: any, conn: DataConnection) => {
  console.log(data);

  // Sender:
  if (data.type == "Accept") {
    sendInfos(conn.peer, data.filetransfer_id);
    sendChunked(conn.peer, data.filetransfer_id, 0);
  } else if (data.type == "ChunkRequest") {
    sendChunked(conn.peer, data.filetransfer_id, data.chunk_id, data.file_id);

  // Receiver:
  } else if (data.type == "Request") {
    handleRequest(data, conn);
    // Testing (without Notification):
    sendAccept(conn.peer, data.filetransfer_id);
  } else if (data.type == "FileInfos") {
    handleFileInfos(data);
  } else if (data.type == "Chunk") {
    handleChunk(data.chunk_info.chunk, data.chunk_info.file_id);
    sendChunkRequest(conn.peer, data.filetransfer_id, data.chunk_info.chunk_id + 1, data.chunk_info.file_id);
  } else if (data.type == "FileFinished") {
    handleFinish(data);
  } else {
    // console.log(data);
  }
};

const handleFinish = (data: any) => {
  let file: string;

  received_chunks.forEach(async (received_file_chunks) => {
    if (received_file_chunks.file_id == data.file_id) {
      console.log('received_file_chunks.file_id == data.file_id')
      file = received_file_chunks.chunks.join("");

      let decrypted_file;
      console.log(received_file_chunks.encrypted)
      if (received_file_chunks.encrypted == "publicKey") {
        console.log('decrypting with key')
        decrypted_file = await decryptFiles([file]);
      } else {
        console.log('decrypting with password')
        decrypted_file = await decryptFilesWithPassword([file], get(page).params.listen_key);
      }

      let url = createFileURL(decrypted_file[0]);
      let info = {
        url: url,
        name: received_file_chunks.file_name,
      };

      received_files.set([...get(received_files), info]);
    }
  });
};

const handleFileInfos = (data: any) => {
  data.files.forEach((file: any) => {
    received_chunks.push({
      file_id: file.file_id,
      file_name: file.file_name,
      encrypted: data.encrypted,
      chunk_number: file.chunk_number,
      chunks: []
    });
  });
};

const handleRequest = (data: any, conn: DataConnection) => {
  let notification;

  notification = {
    title: "Sharing request",
    body: "A user wants to send files to you.",
  };

  addNotification(notification);
};

const sendInfos = (
  peerID: string,
  filetransfer_id: string
) => {
  let pending_filetransfer = pending_filetransfers.find(pending_filetransfer => pending_filetransfer.filetransfer_id == filetransfer_id);

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

      let conn = peer.connect(peerID);

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

      connections.push(conn);
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

    let conn = peer.connect(peerID);

    conn.on("open", function () {

      conn.send({
        type: "Accept",
        filetransfer_id,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.push(conn);
  } else {
    connect_return.send({
      type: "Accept",
      filetransfer_id,
    });
  }
};


const chunkString = (str: string, size: number) => {
  const numChunks = Math.ceil(str.length / size);
  const chunks = new Array(numChunks);

  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substring(o, o + size);
  }

  return chunks;
};

const chunkFiles = (files: FileList, encrypted_files: string[]) => {
  let chunkedFiles: { file: string[], file_name: string, file_id: string, }[] = [];

  for (let i = 0; i < encrypted_files.length; i++) {
    chunkedFiles.push({ file: chunkString(encrypted_files[i], 1000000), file_name: files[i].name, file_id: nanoid(16), });
  }

  return chunkedFiles;
};

let pending_filetransfers: {
  filetransfer_id: string;
  encrypted: string;
  files: {
    file: string[];
    file_name: string;
    file_id: string;
  }[];
}[] = [];

export const sendRequest = (
  filetransfer_id: string,
  peerID: string,
) => {
  let connect_return = connected(peerID);
  if (connect_return == false) {

    let conn = peer.connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "Request",
        filetransfer_id: filetransfer_id,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.push(conn);
  } else {
    connect_return.send({
      type: "Request",
      filetransfer_id: filetransfer_id,
    });
  }
};

const sendChunkRequest = (
  peerID: string,
  filetransfer_id: string,
  chunk_id: number,
  file_id: string
) => {
  let connect_return = connected(peerID);
  if (connect_return == false) {

    let conn = peer.connect(peerID);

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

    connections.push(conn);
  } else {
    connect_return.send({
      type: "ChunkRequest",
      filetransfer_id: filetransfer_id,
      chunk_id,
      file_id
    });
  }
};

let received_chunks: { file_id: string, file_name: string, encrypted: string, chunk_number: number, chunks: string[]; }[] = [];

const handleChunk = (
  chunk: string,
  file_id: string
) => {
  let received_file_chunks = received_chunks.find(received_file_chunks => received_file_chunks.file_id == file_id);

  if (received_file_chunks !== undefined) {
    received_file_chunks.chunks.push(chunk);
  } else {
    console.log("No such file");
  }
};

const sendChunked = (
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

  pending_filetransfers.forEach((pending_filetransfer) => {
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

    let conn = peer.connect(peerID);

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

    connections.push(conn);
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

    pending_filetransfers.push(filetransfer_infos);

    if (peerID !== undefined) {
      sendRequest(filetransfer_infos.filetransfer_id, peerID);
    } else {
      return filetransfer_infos.filetransfer_id;
    }
  }
};

const createFileURL = (file: any) => {
  var blob = new Blob([file]);
  var url = URL.createObjectURL(blob);
  return url;
};

export const addPendingFile = async (files: FileList) => {
  let filetransfer_id = await send(files);

  if (filetransfer_id !== undefined) {
    link.set(
      "http://" +
      location.hostname +
      ":" +
      location.port +
      "/guest/" +
      get(sender_uuid) +
      "/key/" +
      filetransfer_id
    );
  }
};

export const connectAsListener = (
  reciever_uuid: string,
  filetransfer_id: string
) => {
  peer.on("open", (id) => {
    let conn = peer.connect(reciever_uuid);

    conn.on("open", function () {
      conn.send({
        type: "Accept",
        filetransfer_id,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.push(conn);
  });
};

export function connected(receiver_uuid: string): DataConnection | false {
  let conn: DataConnection;
  for (conn of connections) {
    if (conn.peer == receiver_uuid) return conn;
  }

  return false;
}

export const setup = (uuid?: string) => {
  openPeer(uuid);
  listen();
};
