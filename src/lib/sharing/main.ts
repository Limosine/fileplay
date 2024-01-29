import { browser } from "$app/environment";
import { page } from "$app/stores";
import { get } from "svelte/store";

import { updateKey } from "$lib/lib/encryption";
import { type IContact } from "$lib/lib/fetchers";
import { SendState, sendState } from "$lib/lib/sendstate";
import { buffer, sendMessage } from "$lib/lib/simple-peer";
import { contacts, own_did } from "$lib/lib/UI";
import { trpc } from "$lib/trpc/client";

import {
  incoming_filetransfers,
  outgoing_filetransfers,
  link,
  type webRTCData,
  senderLink,
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

export const handleData = (data: webRTCData, did: number) => {
  // Debugging
  if (data.type != "chunk") console.log(data);

  if (data.type == "error") {
    console.warn(`Filetransfer: ${data.message}`);
  } else if (data.type == "update") {
    updateKey(did, data.key);
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
  const filetransferID = await trpc().authorized.createTransfer.mutate();

  const filetransfer_id = await send(
    files,
    undefined,
    undefined,
    filetransferID,
  );

  link.set(
    location.protocol +
      "//" +
      location.host +
      "/guest?did=" +
      get(own_did) +
      "&id=" +
      filetransfer_id,
  );
};

export const authorizeGuestSender = async () => {
  const filetransferID = await trpc().authorized.createTransfer.mutate();

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
  sendMessage(
    {
      type: "accept",
      id: filetransfer_id,
      guest: true,
    },
    did,
  );
};

export const cancelFiletransfer = (contact?: IContact) => {
  sendState.set(contact === undefined ? 0 : contact.cid, SendState.CANCELED);

  outgoing_filetransfers.update((transfers) =>
    transfers.filter((transfer) =>
      contact === undefined ? false : transfer.cid != contact.cid,
    ),
  );

  buffer.update((buffer) => {
    if (contact === undefined) buffer = [];
    else {
      contact.devices.forEach((device) => {
        buffer[device.did] = [];
      });
    }
    return buffer;
  });
};
