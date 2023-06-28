import { nanoid } from "nanoid";
import type { DataConnection } from "peerjs";
import Peer from "peerjs";
import { get, writable } from "svelte/store";
import { page } from "$app/stores";
import { notifications } from "./stores/Dialogs";
import { v4 as uuidv4 } from "uuid";
import {
  decryptFiles,
  decryptFilesWithPassword,
  encryptFiles,
  encryptFilesWithPassword,
} from "./openpgp";
import { updatePeerJS_ID } from "./personal";
import { transferHandler } from "./stores/ReceivedFiles";
import { chunkString, sortArrayByOrder } from "./utils";
import type { WebStream } from "openpgp";

let peer: Peer;
export const sender_uuid = writable<string>();

let connections: DataConnection[] = [];

let pending_files: { listen_key: string; files: FileList }[] = [];
export const link = writable("");
export const received_files = writable<{ url: string; name: string }[]>([]);

const cachedChunks: { transferID: string; chunks: string[] }[] = [];
const chunkIDs: { transferID: string; chunkIDs: string[] }[] = [];

const openPeer = async (uuid?: string) => {
  if (uuid) {
    peer = new Peer(uuid);
  } else peer = new Peer();

  await new Promise<void>((resolve) => {
    peer.on("open", (id) => {
      sender_uuid.set(id);

      if (localStorage.getItem("loggedIn")) {
        updatePeerJS_ID();
      }
      resolve();
    });
  });
};

export const disconnectPeer = () => {
  peer.disconnect();
};

const listen = () => {
  peer.on("connection", (conn) => {
    connections.push(conn);

    conn.on("data", async function (received_data) {
      await handleData(received_data, conn);
    });
  });
};

const handleData = async (data: any, conn: DataConnection) => {
  console.log("Recieved: ", data);
  if (data.listen_key) {
    let pending: { listen_key: string; files: FileList };
    for (pending of pending_files) {
      if (pending.listen_key == data.listen_key) {
        await send(pending.files, conn.peer, pending.listen_key);

        let notification;
        if (pending.files.length == 1) {
          notification = {
            title: "File downloaded",
            content: `The file "${
              Array.from(pending.files)[0].name
            }" was sent.`,
          };
        } else {
          notification = {
            title: "Files downloaded",
            content: `The files "${
              Array.from(pending.files)[0].name
            }", ... were sent.`,
          };
        }
        notifications.set([...get(notifications), notification]);
        pending_files.splice(pending_files.indexOf(pending), 1);
      }
    }
  } else if (data.type) {
    switch (String(data.type)) {
      case "TransferFile": {
        const casted = data as FileSharing.TransferFileMessage;

        if (transferHandler.isProcessFinished(casted.data.transferID)) return;

        if (!transferHandler.isTransferRunning(casted)) {
          transferHandler.addTransferProcess(casted);
        }

        let info: FileSharing.AcceptTransferMessage = {
          type: "AcceptTransfer",
          data: casted.data.transferID,
        };
        conn.send(info);
        break;
      }
      case "AcceptTransfer": {
        const casted = data as FileSharing.AcceptTransferMessage;
        transferHandler.receivedTransferAccept.push(casted.data);
        break;
      }
      case "TransferChunk": {
        const casted = data as FileSharing.TransferChunkMessage;

        if (transferHandler.isProcessFinished(casted.data.transferID)) return;

        const entry = transferHandler.receivedChunks.find((value) => {
          return value.transferID == casted.data.transferID;
        });

        transferHandler.waitForChunks(
          casted.data.transferID,
          () => {
            if (entry) {
              transferHandler.receivedChunks.forEach((value, index, array) => {
                if (value.transferID == casted.data.transferID) {
                  if (value.info.length >= 10) return;
                  const info = value.info;
                  info.push({
                    chunkID: casted.data.chunkID,
                    fileChunk: casted.data.fileChunk,
                  });

                  array[index] = {
                    transferID: value.transferID,
                    info,
                  };
                  return;
                }
              });
            } else {
              transferHandler.receivedChunks.push({
                transferID: casted.data.transferID,
                info: [
                  {
                    chunkID: casted.data.chunkID,
                    fileChunk: casted.data.fileChunk,
                  },
                ],
              });
            }
          },
          () => {
            //TODO: Abort...
            // console.log("ERROR: Timed out waiting for file chunks");
          }
        );
        break;
      }
      case "RequestChunk": {
        const casted = data as FileSharing.RequestChunk;
        transferHandler.receivedRChunks.push(casted.data);

        const requestedChunks = transferHandler.receivedRChunks.find(
          (value) => {
            return value.transferID == casted.data.transferID;
          }
        );

        for (let i = 0; i < cachedChunks.length; i++) {
          const cachedChunkIDs = chunkIDs.find((value) => {
            return value.transferID == casted.data.transferID;
          });
          const extractedChunks = cachedChunks.find((value) => {
            return value.transferID == casted.data.transferID;
          });
          if (cachedChunkIDs && requestedChunks && extractedChunks) {
            if (cachedChunkIDs.chunkIDs.includes(requestedChunks.chunkIDs[i])) {
              const info: FileSharing.TransferChunkMessage = {
                data: {
                  chunkID: cachedChunkIDs.chunkIDs[i],
                  fileChunk: extractedChunks.chunks[i],
                  transferID: casted.data.transferID,
                },
                type: "TransferChunk",
              };
              conn.send(info);
            }
          }
        }

        const info: FileSharing.SendComplete = {
          data: casted.data.transferID,
          type: "SendComplete",
        };
        conn.send(info);
        break;
      }
      case "SendComplete": {
        const casted = data as FileSharing.SendComplete;
        transferHandler.sentComplete.push(casted.data);
        transferHandler.checkChunksComplete(
          casted.data,
          () => {
            const info: FileSharing.ReceiveComplete = {
              data: casted.data,
              type: "ReceiveComplete",
            };
            conn.send(info);
            const receivedChunks = transferHandler.receivedChunks.find(
              (value) => {
                return value.transferID == casted.data;
              }
            );

            transferHandler.finishProcess(casted.data);
            const process = transferHandler.getProcess(casted.data);
            if (receivedChunks && process) {
              const sortedChunks = sortArrayByOrder(
                receivedChunks.info,
                process.data.chunkIDs
              );

              const extractedChunks = sortedChunks.map((value) => {
                return value.fileChunk;
              });

              console.log("Sorted: ", extractedChunks);
              const joinedString = [extractedChunks.join("")];
              console.log("Joined:", joinedString);

              let decrypted_files;
              console.log("part 1");
              if (transferHandler.isPasswordProtected(casted.data)) {
                decrypted_files = decryptFilesWithPassword(
                  joinedString,
                  get(page).params.listen_key
                );
              } else {
                decrypted_files = decryptFiles(joinedString);
              }
              console.log("Part 2");
              decrypted_files.then((decrypted_files) => {
                console.log("Decrypt: ", decrypted_files);
                for (let i = 0; i < decrypted_files.length; i++) {
                  let url = createFileURL(decrypted_files[i]);
                  let info = {
                    url: url,
                    name: process.data.fileName,
                  };
                  console.log("INFOOO: ", info);
                  received_files.set([...get(received_files), info]);
                }
              });
            }

            transferHandler.receivedChunks =
              transferHandler.receivedChunks.filter((value) => {
                return value.transferID != casted.data;
              });
            transferHandler.lastChunk = transferHandler.lastChunk.filter(
              (value) => {
                return value.transferID != casted.data;
              }
            );
            transferHandler.sentComplete = transferHandler.sentComplete.filter(
              (value) => {
                return value != casted.data;
              }
            );
            transferHandler.receivedTransferAccept =
              transferHandler.receivedTransferAccept.filter((value) => {
                return value != casted.data;
              });

            transferHandler.removeTransferProcess(casted.data);
          },
          (missingChunks) => {
            const info: FileSharing.RequestChunk = {
              data: {
                chunkIDs: missingChunks,
                transferID: casted.data,
              },
              type: "RequestChunk",
            };
            conn.send(info);
          }
        );
        break;
      }
      case "ReceiveComplete":
        const casted = data as FileSharing.ReceiveComplete;
        transferHandler.receivedComplete.push(casted.data);
    }
  }
};

const createFileURL = (file: any) => {
  var blob = new Blob([file]);
  var url = URL.createObjectURL(blob);
  return url;
};

export const addPendingFile = (files: FileList) => {
  let listen_key = nanoid(16);
  let pending = {
    listen_key: listen_key,
    files: files,
  };
  pending_files.push(pending);

  console.log(
    "http://" +
      location.hostname +
      ":" +
      location.port +
      "/guest/" +
      get(sender_uuid) +
      "/key/" +
      listen_key
  );

  link.set(
    "http://" +
      location.hostname +
      ":" +
      location.port +
      "/guest/" +
      get(sender_uuid) +
      "/key/" +
      listen_key
  );
};

export const connectAsListener = (sender_uuid: string, listen_key: string) => {
  peer.on("open", (id) => {
    let conn = peer.connect(sender_uuid);

    conn.on("open", function () {
      console.log("Sending listen key: ", listen_key);
      conn.send({
        listen_key: listen_key,
      });

      // Listener for file transfer
      conn.on("data", async function (received_data) {
        await handleData(received_data, conn);
      });
    });

    connections.push(conn);
  });
};

export function connected(reciever_uuid: string): DataConnection | false {
  let conn: DataConnection;
  for (conn of connections) {
    if (conn.peer == reciever_uuid) return conn;
  }

  return false;
}

/**
 * Send files to a peer. Either a password or a public key has to be defined.
 * @param files FileList to send
 * @param peerID The id of the peer to send the files to
 * @param password a password to encrypt the files with (optional)
 * @param publicKey a public key to encrypt the files with (optional)
 */
export const send = async (
  files: FileList,
  peerID: string,
  password?: string,
  publicKey?: string
) => {
  if (files) {
    let filenames: string[] = [];
    let file: File;
    for (file of Array.from(files)) {
      filenames.push(file.name);
    }

    let encrypted_files: Promise<WebStream<string>[]>;
    if (publicKey !== undefined) {
      encrypted_files = encryptFiles(files, publicKey);
    } else if (password !== undefined) {
      encrypted_files = encryptFilesWithPassword(files, password);
    } else {
      throw new Error("A password or public key has to be defined.");
    }

    let connect_return = connected(peerID);
    console.log("connected for peerId ", peerID, "is", connect_return);
    let conn = connect_return == false ? peer.connect(peerID) : connect_return;
    console.log("conn is ", conn);
    if (conn === undefined) throw new Error("Connection is undefined");

    new Promise<void>((resolve) => {
      if (!connect_return) {
        conn.on("open", () => {
          console.log("conn is open, sending files");
          resolve();
        });
      } else {
        resolve();
      }
    }).then(() => {
      encrypted_files.then((encrypted_files) => {
        // Sending file sizes inside an array to show different progress sizes for
        // Spicing encrypted file content into ten equal parts since peerjs api doesn't chunk properly
        // Each part has a property identifying its order inside the file
        for (let index = 0; index < encrypted_files.length; index++) {
          const transferID = uuidv4();
          const enc_file = encrypted_files.at(index);
          console.log("Enc file: ", [String(enc_file)]);

          if (!enc_file) continue;

          const tempChunkIDs: string[] = [];
          const tempCachedChunks = chunkString(String(enc_file), 10);
          for (let i = 0; i < 10; i++) {
            const chunkID = uuidv4();
            tempChunkIDs.push(chunkID);
          }
          chunkIDs.push({
            transferID,
            chunkIDs: tempChunkIDs,
          });

          cachedChunks.push({
            transferID,
            chunks: tempCachedChunks,
          });

          const info: FileSharing.TransferFileMessage = {
            type: "TransferFile",
            data: {
              chunkIDs: tempChunkIDs,
              fileName: filenames[index],
              transferID: transferID,
              encrypted: publicKey !== undefined ? "publickey" : "password",
            },
          };

          conn.send(info);

          transferHandler.confirmAcceptTransfer(
            transferID,
            () => {
              for (let i = 0; i < tempCachedChunks.length; i++) {
                const info: FileSharing.TransferChunkMessage = {
                  data: {
                    chunkID: tempChunkIDs[i],
                    fileChunk: tempCachedChunks[i],
                    transferID,
                  },
                  type: "TransferChunk",
                };

                conn.send(info);
                // console.log(info);
              }
              const info: FileSharing.SendComplete = {
                data: transferID,
                type: "SendComplete",
              };

              conn.send(info);
              transferHandler.confirmComplete(
                transferID,
                () => {
                  // TODO: Complete
                  // console.log("Transfer complete...");
                  transferHandler.receivedComplete =
                    transferHandler.receivedComplete.filter(
                      (value) => value != transferID
                    );
                  transferHandler.removeFails(transferID);
                  transferHandler.receivedRChunks =
                    transferHandler.receivedRChunks.filter((value) => {
                      return value.transferID != transferID;
                    });
                  transferHandler.receivedTransferAccept =
                    transferHandler.receivedTransferAccept.filter((value) => {
                      return value != transferID;
                    });
                },
                () => {
                  // TODO: Cancel
                  // console.log("Aborting file share due to unexpected error...");
                },
                () => {
                  const requestedChunks = transferHandler.receivedRChunks.find(
                    (value) => {
                      return value.transferID == transferID;
                    }
                  );

                  for (let i = 0; i < cachedChunks.length; i++) {
                    if (requestedChunks?.chunkIDs.includes(tempChunkIDs[i])) {
                      const info: FileSharing.TransferChunkMessage = {
                        data: {
                          chunkID: tempChunkIDs[i],
                          fileChunk: tempCachedChunks[i],
                          transferID,
                        },
                        type: "TransferChunk",
                      };
                      conn.send(info);
                    }
                  }
                },
                () => {
                  conn.send(info);
                }
              );
            },
            () => {
              // TODO: Cancel
              throw new Error("Aborting file share due to unexpected error...");
            },
            () => {
              conn.send(info);
            }
          );
        }
      });
    });

    conn.on("data", async function (received_data) {
      await handleData(received_data, conn);
    });

    connections.push(conn);
  }
};

export const setup = async (uuid?: string) => {
  await openPeer(uuid);
  listen();
};
