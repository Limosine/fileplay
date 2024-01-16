import { browser } from "$app/environment";
import { page } from "$app/stores";
import { get } from "svelte/store";

import { startHeartbeat } from "$lib/lib/fetchers";
import { sendMessage } from "$lib/lib/simple-peer";
import { contacts, own_did } from "$lib/lib/UI";

import {
  incoming_filetransfers,
  outgoing_filetransfers,
  type Error,
  type Request,
  type Accept,
  type FiletransferFinished,
  type FileFinished,
  type Chunk,
  link,
} from "./common";
import { send, sendChunked, sendRequest } from "./send";
import {
  handleRequest,
  handleChunk,
  handleFileFinish,
  handleFileTransferFinished,
} from "./handle";
import { trpc } from "$lib/trpc/client";

const authenticated = (
  did: number,
  filetransfer_id: string,
  type:
    | "chunk"
    | "file-finish"
    | "transfer-finish"
    | "accept"
    | "request"
    | "error",
) => {
  // Guest page
  if (browser && window.location.pathname.slice(0, 6) == "/guest") {
    if (Number(get(page).params.did) === did) {
      return true;
    } else return false;
  }

  // Home page - Skip if sending via link or filetransfer is already running
  if (
    get(outgoing_filetransfers).find(
      (filetransfer) =>
        filetransfer.id == filetransfer_id &&
        (filetransfer.cid === undefined || filetransfer.did === did),
    ) !== undefined
  )
    return true;

  // Home page - Skip if filetransfer is already running
  if (
    get(incoming_filetransfers).find(
      (filetransfer) =>
        !filetransfer.completed &&
        filetransfer.id == filetransfer_id &&
        filetransfer.did === did,
    ) !== undefined
  )
    return true;

  if (
    get(contacts).find(
      (con) =>
        type == "request" &&
        con.devices.find((dev) => dev.did === did) !== undefined,
    ) !== undefined
  )
    return true;

  return false;
};

export const handleData = (
  data: Chunk | FileFinished | FiletransferFinished | Accept | Request | Error,
  did: number,
) => {
  console.log(data);

  if (data.type == "error") {
    console.warn(`Filetransfer: ${data.message}`);
  } else if (authenticated(did, data.id, data.type)) {
    // Sender:
    if (data.type == "accept") {
      if (data.guest == true) sendRequest(did, data.id);
      else sendChunked(did, data.id);

      // Receiver:
    } else if (data.type == "request") {
      handleRequest(did, data.id, data.encrypted, data.files);
    } else if (data.type == "chunk") {
      handleChunk(
        did,
        data.id,
        data.chunk.file_id,
        data.chunk.data,
        data.chunk.id,
        data.final,
      );
    } else if (data.type == "file-finish") {
      handleFileFinish(did, data.id, data.file_id, data.missing);
    } else if (data.type == "transfer-finish") {
      handleFileTransferFinished(data.id);
    }
  } else {
    sendMessage(
      {
        type: "error",
        message: "401 Unauthorized",
      },
      did,
    );
  }
};

export const addPendingFile = async (files: FileList) => {
  const filetransferID = await trpc().createTransfer.mutate();

  if (filetransferID.success) {
    const filetransfer_id = await send(
      files,
      undefined,
      undefined,
      undefined,
      filetransferID.message,
    );

    link.set(
      "http://" +
        location.hostname +
        ":" +
        location.port +
        "/guest/" +
        get(own_did) +
        "/key/" +
        filetransfer_id,
    );
  } else {
    throw new Error("Failed to register Filetransfer.");
  }
};

export const connectAsListener = (did: number, filetransfer_id: string) => {
  startHeartbeat();

  sendMessage(
    {
      type: "accept",
      id: filetransfer_id,
      guest: true,
    },
    did,
  );
};
