import { nanoid } from "nanoid";
import type { DataConnection } from "peerjs";
import Peer from "peerjs";
import { get, writable } from "svelte/store";
import { page } from "$app/stores";
import {
  decryptFiles,
  decryptFilesWithPassword,
  encryptFiles,
  encryptFilesWithPassword,
} from "./openpgp";

import { finishedTransfers, receivedChunks } from "./stores/ReceivedFiles";
let peer: Peer;
export const sender_uuid = writable<string>();

let connections: DataConnection[] = [];

export const link = writable("");
export const received_files = writable<{ url: string; name: string }[]>([]);

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

    conn.on("data", function (receivedData) {
      handleData(receivedData, conn);
    });
  });
};

const handleData = (data: any, conn: DataConnection) => {
  console.log(data);

  // Sender:
  if (data.type == "Accept") {
    sendInfos(conn.peer, data.filetransferID);
    sendChunked(conn.peer, data.filetransferID, 0);
  } else if (data.type == "ChunkRequest") {
    sendChunked(conn.peer, data.filetransferID, data.chunkID, data.fileID);

    // Receiver:
  } else if (data.type == "Request") {
    // handleRequest(data, conn);
    // Testing (without Notification):
    sendAccept(conn.peer, data.filetransferID);
  } else if (data.type == "FileInfos") {
    handleFileInfos(data);
  } else if (data.type == "Chunk") {
    handleChunk(data.chunkInfo.chunk, data.chunkInfo.fileID);
    sendChunkRequest(
      conn.peer,
      data.filetransferID,
      data.chunkInfo.chunkID + 1,
      data.chunkInfo.fileID
    );
  } else if (data.type == "FileFinished") {
    handleFinish(data);
  }
};

const handleFinish = (data: any) => {
  console.log("Handle Finish: ", data)
  let file: string;
  const fileInformation = receivedChunks.getInformation(data.fileID);
  console.log("File Information: ", fileInformation)
  if (fileInformation) {
    file = fileInformation.chunks.join("");
    console.log("file finished: ", file)
    let decryptedFile;
    if (fileInformation.encrypted == "publicKey") {
      decryptedFile = decryptFiles([file]);
    } else {
      decryptedFile = decryptFilesWithPassword(
        [file],
        get(page).params.listen_key
      );
    }

    decryptedFile.then((decryptedFile) => {
      let url = createFileURL(decryptedFile[0]);
      let info = {
        url: url,
        name: fileInformation.fileName,
      };

      received_files.set([...get(received_files), info]);
    });
    finishedTransfers.addTransfer(data.fileID);
  }

  // received_chunks.forEach(async (received_file_chunks) => {
  //   if (received_file_chunks.fileID == data.fileID) {
  //     file = received_file_chunks.chunks.join("");

  //     let decrypted_file = await decryptFilesWithPassword(
  //       [file],
  //       get(page).params.listen_key
  //     );

  //     let url = createFileURL(decrypted_file[0]);
  //     let info = {
  //       url: url,
  //       name: received_file_chunks.fileName,
  //     };

  //     received_files.set([...get(received_files), info]);
  //   }
  // });
};

const handleFileInfos = (data: any) => {
  console.log("Handling file infos: ", data);
  data.files.forEach((file: any) => {
    receivedChunks.addInformation(
      file.fileID,
      file.fileName,
      data.encrypted,
      file.chunkNumber,
      []
    );

    // received_chunks.push({
    //   fileID: file.fileID,
    //   fileName: file.fileName,
    //   encrypted: data.encrypted,
    //   chunk_number: file.chunk_number,
    //   chunks: [],
    // });
  });
};

// const handleRequest = (data: any, conn: DataConnection) => {
//   let notification;

//   notification = {
//     title: "Sharing request",
//     body: "A user wants to send files to you.",
//   };

//   addNotification(notification);
// };

const sendInfos = (peerID: string, filetransferID: string) => {
  let pendingFiletransfer = pendingFiletransfers.find(
    (pendingFiletransfer) =>
      pendingFiletransfer.filetransferID == filetransferID
  );

  if (pendingFiletransfer !== undefined) {
    let files: {
      fileName: string;
      fileID: string;
      chunkNumber: number;
    }[] = [];

    pendingFiletransfer.files.forEach((file) => {
      files.push({
        fileName: file.fileName,
        fileID: file.fileID,
        chunkNumber: file.file.length,
      });
    });

    let connectReturn = connected(peerID);
    if (connectReturn == false) {
      let conn = peer.connect(peerID);

      conn.on("open", function () {
        if (pendingFiletransfer !== undefined) {
          conn.send({
            type: "FileInfos",
            filetransferID: pendingFiletransfer.filetransferID,
            encrypted: pendingFiletransfer.encrypted,
            files,
          });
        }
      });

      conn.on("data", function (receivedData) {
        handleData(receivedData, conn);
      });

      connections.push(conn);
    } else {
      connectReturn.send({
        type: "FileInfos",
        filetransferID: pendingFiletransfer.filetransferID,
        encrypted: pendingFiletransfer.encrypted,
        files,
      });
    }
  } else {
    console.log("Wrong filetransfer id.");
  }
};

export const sendAccept = (peerID: string, filetransferID: string) => {
  let connectReturn = connected(peerID);
  if (connectReturn == false) {
    let conn = peer.connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "Accept",
        filetransferID,
      });
    });

    conn.on("data", function (receivedData) {
      handleData(receivedData, conn);
    });

    connections.push(conn);
  } else {
    connectReturn.send({
      type: "Accept",
      filetransferID,
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

const chunkFiles = (files: FileList, encryptedFiles: string[]) => {
  let chunkedFiles: { file: string[]; fileName: string; fileID: string }[] = [];

  for (let i = 0; i < encryptedFiles.length; i++) {
    chunkedFiles.push({
      file: chunkString(encryptedFiles[i], 1000000),
      fileName: files[i].name,
      fileID: nanoid(16),
    });
  }

  return chunkedFiles;
};

let pendingFiletransfers: {
  filetransferID: string;
  encrypted: string;
  files: {
    file: string[];
    fileName: string;
    fileID: string;
  }[];
}[] = [];

export const sendRequest = (filetransferID: string, peerID: string) => {
  let connectReturn = connected(peerID);
  if (connectReturn == false) {
    let conn = peer.connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "Request",
        filetransferID: filetransferID,
      });
    });

    conn.on("data", function (receivedData) {
      handleData(receivedData, conn);
    });

    connections.push(conn);
  } else {
    connectReturn.send({
      type: "Request",
      filetransferID: filetransferID,
    });
  }
};

const sendChunkRequest = (
  peerID: string,
  filetransferID: string,
  chunkID: number,
  fileID: string
) => {
  let connectReturn = connected(peerID);
  if (connectReturn == false) {
    let conn = peer.connect(peerID);

    conn.on("open", function () {
      conn.send({
        type: "ChunkRequest",
        filetransferID,
        chunkID,
        fileID,
      });
    });

    conn.on("data", function (receivedData) {
      handleData(receivedData, conn);
    });

    connections.push(conn);
  } else {
    connectReturn.send({
      type: "ChunkRequest",
      filetransferID,
      chunkID,
      fileID,
    });
  }
};

const handleChunk = (chunk: string, fileID: string) => {
  receivedChunks.addChunk(fileID, chunk);
  // let received_file_chunks = received_chunks.find(
  //   (received_file_chunks) => received_file_chunks.fileID == fileID
  // );

  // if (received_file_chunks !== undefined) {
  //   received_file_chunks.chunks.push(chunk);
  // } else {
  //   console.log("No such file");
  // }
};

const sendChunked = (
  peerID: string,
  filetransferID: string,
  chunkID: number,
  fileID?: string
) => {
  let chunkInfo:
    | {
        fileID: string;
        chunkID: number;
        chunk: string;
      }
    | undefined;
  let fileFinished: string | undefined;

  pendingFiletransfers.forEach((pendingFiletransfer) => {
    if (pendingFiletransfer.filetransferID == filetransferID) {
      if (fileID === undefined) {
        chunkInfo = {
          fileID: pendingFiletransfer.files[0].fileID,
          chunkID: chunkID,
          chunk: pendingFiletransfer.files[0].file[chunkID],
        };
      }
      pendingFiletransfer.files.forEach((pendingFile) => {
        if (pendingFile.fileID == fileID) {
          if (chunkID < pendingFile.file.length) {
            chunkInfo = {
              fileID: pendingFile.fileID,
              chunkID: chunkID,
              chunk: pendingFile.file[chunkID],
            };
          } else {
            fileFinished = pendingFile.fileID;
            let index = pendingFiletransfer.files.indexOf(pendingFile) + 1;

            if (index < pendingFiletransfer.files.length) {
              let file = pendingFiletransfer.files[index];
              chunkInfo = {
                fileID: file.fileID,
                chunkID: 0,
                chunk: file.file[0],
              };
            }
          }
        }
      });
    }
  });

  let connectReturn = connected(peerID);
  if (connectReturn == false) {
    let conn = peer.connect(peerID);

    conn.on("open", function () {
      if (fileFinished !== undefined) {
        conn.send({
          type: "FileFinished",
          fileID: fileFinished,
        });
      }
      if (chunkInfo !== undefined) {
        conn.send({
          type: "Chunk",
          filetransferID: filetransferID,
          chunkInfo,
        });
      }
    });

    conn.on("data", function (receivedData) {
      handleData(receivedData, conn);
    });

    connections.push(conn);
  } else {
    if (fileFinished !== undefined) {
      connectReturn.send({
        type: "FileFinished",
        fileID: fileFinished,
      });
    }
    if (chunkInfo !== undefined) {
      connectReturn.send({
        type: "Chunk",
        filetransferID: filetransferID,
        chunkInfo,
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
    let filetransferInfos: {
      filetransferID: string;
      encrypted: string;
      files: {
        file: string[];
        fileName: string;
        fileID: string;
      }[];
    };

    let encryptedFiles: string[];
    if (publicKey !== undefined) {
      encryptedFiles = await encryptFiles(files, publicKey);
      console.log("SEnding");
      filetransferInfos = {
        filetransferID: nanoid(16),
        encrypted: "publicKey",
        files: chunkFiles(files, encryptedFiles),
      };
    } else {
      let filetransferID = nanoid(16);
      encryptedFiles = await encryptFilesWithPassword(files, filetransferID);
      filetransferInfos = {
        filetransferID,
        encrypted: "password",
        files: chunkFiles(files, encryptedFiles),
      };
    }

    pendingFiletransfers.push(filetransferInfos);

    if (peerID !== undefined) {
      sendRequest(filetransferInfos.filetransferID, peerID);
    } else {
      return filetransferInfos.filetransferID;
    }
  }
};

const createFileURL = (file: any) => {
  var blob = new Blob([file]);
  var url = URL.createObjectURL(blob);
  return url;
};

export const addPendingFile = async (files: FileList) => {
  let filetransferID = await send(files);

  if (filetransferID !== undefined) {
    link.set(
      "http://" +
        location.hostname +
        ":" +
        location.port +
        "/guest/" +
        get(sender_uuid) +
        "/key/" +
        filetransferID
    );
  }
};

export const connectAsListener = (
  reciever_uuid: string,
  filetransferID: string
) => {
  peer.on("open", (id) => {
    let conn = peer.connect(reciever_uuid);

    conn.on("open", function () {
      conn.send({
        type: "Accept",
        filetransferID,
      });
    });

    conn.on("data", function (receivedData) {
      handleData(receivedData, conn);
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
