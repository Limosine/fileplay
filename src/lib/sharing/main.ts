import { browser } from "$app/environment";
import { page } from "$app/stores";
import { get } from "svelte/store";

import { apiClient } from "$lib/api/client";
import { type IContact } from "$lib/lib/fetchers";
import { SendState, sendState } from "$lib/lib/sendstate";
import { peer } from "$lib/lib/simple-peer";
import { contacts, own_did } from "$lib/lib/UI";

import {
  incoming_filetransfers,
  outgoing_filetransfers,
  link,
  type webRTCData,
  senderLink,
  type Update,
} from "./common";
import {
  handleRequest,
  handleChunk,
  handleFileFinish,
  handleFileTransferFinished,
} from "./handle";
import { send, sendChunked, sendRequest } from "./send";

const authenticated = (
  did: number,
  filetransfer_id: string,
  type: webRTCData["type"],
  previous?: string,
) => {
  // Guest page
  if (browser && window.location.pathname.slice(0, 6) == "/guest") {
    if (Number(get(page).url.searchParams.get("did")) === did) {
      return true;
    } else return false;
  }

  // Home page - Skip if sending via link or filetransfer is already running
  if (
    get(outgoing_filetransfers).find(
      (filetransfer) =>
        (previous !== undefined &&
          type == "request" &&
          filetransfer.id == previous &&
          filetransfer.cid === undefined) ||
        (filetransfer.id == filetransfer_id &&
          (filetransfer.cid === undefined || filetransfer.did === did)),
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

export const handleData = (data: Exclude<webRTCData, Update>, did: number) => {
  if (data.type == "error") {
    console.warn(`Filetransfer: ${data.message}`);
  } else if (
    authenticated(
      did,
      data.id,
      data.type,
      "previous" in data ? data.previous : undefined,
    )
  ) {
    // Sender:
    if (data.type == "accept") {
      if (data.guest == true) sendRequest(did, data.id);
      else sendChunked(did, data.id);
    } else if (data.type == "reject") {
      handleFileTransferFinished(data.id, true);
    } else if (data.type == "file-finish") {
      handleFileFinish(did, data.id, data.file_id, data.missing);
    } else if (data.type == "transfer-finish") {
      handleFileTransferFinished(data.id, false);

      // Receiver:
    } else if (data.type == "request") {
      handleRequest(did, data.id, data.files);
    } else if (data.type == "chunk") {
      handleChunk(
        did,
        data.id,
        data.chunk.file_id,
        data.chunk.data,
        data.chunk.id,
        data.final,
      );
    }
  } else {
    peer().sendMessage(did, {
      type: "error",
      message: "401 Unauthorized",
    });
  }
};

export const addPendingFile = async () => {
  const filetransferID = await apiClient("ws").sendMessage({
    type: "createTransfer",
  });

  await send(undefined, undefined, filetransferID);

  link.set(
    location.protocol +
      "//" +
      location.host +
      "/guest?did=" +
      get(own_did) +
      "&id=" +
      filetransferID,
  );
};

export const authorizeGuestSender = async () => {
  const filetransferID = await apiClient("ws").sendMessage({
    type: "createTransfer",
  });

  outgoing_filetransfers.update((transfers) => {
    transfers.push({
      id: filetransferID,
      completed: true,
      files: [],
    });
    return transfers;
  });

  senderLink.set(
    location.protocol +
      "//" +
      location.host +
      "/guest?did=" +
      get(own_did) +
      "&id=" +
      filetransferID +
      "&sender",
  );
};

export const connectAsListener = (did: number, filetransfer_id: string) => {
  peer().sendMessage(did, {
    type: "accept",
    id: filetransfer_id,
    guest: true,
  });
};

export const cancelFiletransfer = (contact?: IContact | number) => {
  const con =
    typeof contact == "number"
      ? get(contacts).find((con) => con.cid === contact)
      : contact;

  sendState.set(con === undefined ? 0 : con.cid, SendState.CANCELED);

  outgoing_filetransfers.update((transfers) =>
    transfers.filter((transfer) =>
      con === undefined ? false : transfer.cid != con.cid,
    ),
  );

  if (con === undefined) peer().clearBuffer();
  else {
    con.devices.forEach((device) => {
      peer().clearBuffer(device.did);
    });
  }
};
