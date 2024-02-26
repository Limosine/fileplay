import { get } from "svelte/store";

import type { IContact } from "$lib/lib/fetchers";
import { sendState, SendState } from "$lib/lib/sendstate";
import { peer } from "$lib/lib/simple-peer";
import { addNotification, contacts } from "$lib/lib/UI";
import { onGuestPage } from "$lib/lib/utils";

import {
  incoming_filetransfers,
  type IncomingFiletransfer,
  outgoing_filetransfers,
  type Request,
  outgoing_notifications,
  incoming_notifications,
} from "./common";
import { send, sendAnswer, sendChunked, sendFinish, sendMissing } from "./send";

export const handleReady = (did: number, nid: string) => {
  let contact: IContact | false = false;
  for (const c of get(contacts)) {
    const device = c.devices.find((device) => device.did === did);
    if (device !== undefined) {
      contact = c;
      break;
    }
  }
  if (contact === false)
    throw new Error("Filetransfer: Failed to find contact.");

  const request = get(outgoing_notifications).find(
    (request) =>
      request.id == nid && contact !== false && request.uid === contact.uid,
  );

  if (request === undefined) {
    peer().sendMessage(did, {
      type: "error",
      message: "401 Unauthorized",
    });
  } else {
    send(did, contact.cid, undefined, request.files, nid);
  }
};

const knownNotification = (did: number, nid?: string) => {
  if (nid === undefined) return false;

  return get(incoming_notifications).some(
    (request) => request.id == nid && request.did === did,
  );
};

export const acceptRequest = (
  did: number,
  filetransfer_id: string,
  fileInfos: Request["files"],
) => {
  const files: IncomingFiletransfer["files"] = [];

  fileInfos.forEach((file) => {
    files.push({
      id: file.id,
      name: file.name,
      chunks_length: file.chunks_length,
      chunks: [],
    });
  });

  let cid: number | undefined = undefined;
  if (!onGuestPage()) {
    const contact = get(contacts).find(
      (contact) =>
        contact.devices.find((device) => device.did == did) !== undefined,
    );
    cid = contact !== undefined ? contact.cid : undefined;
  }

  const filetransfer: IncomingFiletransfer = {
    id: filetransfer_id,
    completed: false,
    files,
    did,
    cid,
  };

  incoming_filetransfers.set([...get(incoming_filetransfers), filetransfer]);

  if (!onGuestPage()) {
    addNotification({
      title: "Receiving file(s)",
      body: `The file(s) '${filetransfer.files
        .map((file) => file.name)
        .toString()}' is/are being received.`,
      tag: `filetransfer-${filetransfer.id}`,
      data: { did, filetransfer_id: filetransfer.id },
    });
  }

  sendAnswer(did, filetransfer_id, true);
};

export const handleRequest = (
  did: number,
  filetransfer_id: string,
  files_unformatted: Request["files"],
  nid?: string,
) => {
  if (onGuestPage() || knownNotification(did, nid)) {
    acceptRequest(did, filetransfer_id, files_unformatted);
  } else {
    addNotification({
      title: "File request",
      body: `The file${files_unformatted.length > 1 ? "s" : ""} '${files_unformatted
        .map((file) => file.name)
        .toString()}' can be received.`,
      tag: `filetransfer-${filetransfer_id}`,
      data: {
        did: did,
        filetransfer_id: filetransfer_id,
        files: files_unformatted,
      },
    });
  }
};

export const handleChunk = (
  did: number,
  filetransfer_id: string,
  file_id: string,
  chunk: Uint8Array,
  chunk_id: number,
  final?: boolean,
) => {
  const filetransfer_index = get(incoming_filetransfers).findIndex(
    (filetransfer) => filetransfer.id == filetransfer_id,
  );
  if (filetransfer_index === -1)
    throw new Error("Filetransfer: No such filetransfer");

  const file_index = get(incoming_filetransfers)[
    filetransfer_index
  ].files.findIndex((file) => file.id == file_id);
  if (file_index === -1) throw new Error("Filetransfer: No such file");

  incoming_filetransfers.update((filetransfers) => {
    filetransfers[filetransfer_index].files[file_index].chunks[chunk_id] =
      chunk;
    return filetransfers;
  });

  if (final) {
    if (
      get(incoming_filetransfers)[filetransfer_index].files.slice(-1)[0].id ===
      file_id
    ) {
      sendFinish(did, filetransfer_id, file_id, true);
    } else {
      sendFinish(did, filetransfer_id, file_id, false);
    }
  }
};

export const handleFileFinish = async (
  did: number,
  filetransfer_id: string,
  file_id: string,
  missing?: number[],
) => {
  if (missing) {
    sendMissing(did, filetransfer_id, file_id, missing);
  } else {
    sendChunked(did, filetransfer_id, file_id);
  }
};

export const handleFileTransferFinished = (
  filetransfer_id: string,
  reject: boolean,
) => {
  const filetransfer = get(outgoing_filetransfers).find(
    (filetransfer) => filetransfer.id == filetransfer_id,
  );

  if (filetransfer !== undefined && filetransfer.cid !== undefined) {
    sendState.set(
      filetransfer.cid,
      reject ? SendState.REJECTED : SendState.SENT,
    );

    outgoing_filetransfers.update((filetransfers) =>
      filetransfers.filter(
        (filetransfer) => filetransfer.id != filetransfer_id,
      ),
    );
  }
};
