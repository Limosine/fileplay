import { nanoid } from "nanoid";
import { get } from "svelte/store";

import { SendState, sendState } from "$lib/lib/sendstate";
import { peer } from "$lib/lib/simple-peer";
import { addNotification, deleteNotification } from "$lib/lib/UI";

import {
  incoming_filetransfers,
  outgoing_filetransfers,
  type FileInfos,
  createFileURL,
  type Request,
  concatArrays,
} from "./common";

// Sender:
export const send = async (
  files: FileList,
  did?: number,
  cid?: number,
  filetransfer_id?: string,
) => {
  if (files.length <= 0)
    throw new Error("Filetransfer: One file has to be selected.");

  let filetransferID: string;
  if (filetransfer_id === undefined) {
    filetransferID = nanoid();
  } else {
    filetransferID = filetransfer_id;
  }

  if (cid !== undefined && get(sendState)[cid] !== SendState.CHUNKING) {
    sendState.set(cid, SendState.CHUNKING);
  }

  const client = navigator.serviceWorker.controller;
  if (client === null)
    throw new Error("Filetransfer: Service worker not active.");

  client.postMessage({
    action: "chunk-files",
    data: {
      id: filetransferID,
      files,
    },
  });

  const filetransfer_infos = {
    id: filetransferID,
    completed: false,
    cid,
    did,
  };

  outgoing_filetransfers.set([
    ...get(outgoing_filetransfers),
    filetransfer_infos,
  ]);

  return filetransfer_infos.id;
};

export const sendRequest = (
  did: number,
  filetransfer_id: string,
  previous?: string,
) => {
  const outgoing_filetransfer = get(outgoing_filetransfers).find(
    (outgoing_filetransfer) => outgoing_filetransfer.id == filetransfer_id,
  );

  if (outgoing_filetransfer !== undefined) {
    if (outgoing_filetransfer.files !== undefined) {
      const files: Request["files"] = [];

      outgoing_filetransfer.files.forEach((file) => {
        files.push({
          id: file.id,
          name: file.name,
          chunks_length: file.chunks.length,
        });
      });

      peer().sendMessage(did, {
        type: "request",
        id: outgoing_filetransfer.id,
        files,
        previous,
      });
    } else {
      console.log("Filetransfer: Files not yet chunked.");
    }
  } else {
    console.log("Filetransfer: Wrong filetransfer id.");
  }
};

export const sendChunked = async (
  did: number,
  filetransfer_id: string,
  previous_file_id?: string,
) => {
  const filetransfer_index = get(outgoing_filetransfers).findIndex(
    (transfer) => transfer.id == filetransfer_id,
  );
  if (filetransfer_index === -1)
    throw new Error("Filetransfer: Filetransfer not found.");

  const filetransfer = get(outgoing_filetransfers)[filetransfer_index];
  if (filetransfer.files === undefined)
    throw new Error("Filetransfer: Files not yet chunked.");

  let file: Omit<FileInfos, "url">;
  if (previous_file_id === undefined) {
    const cid = filetransfer.cid;
    if (cid !== undefined) sendState.set(cid, SendState.SENDING);
    file = filetransfer.files[0];
  } else {
    let index = filetransfer.files.findIndex(
      (file) => file.id == previous_file_id,
    );
    if (index === -1) throw new Error("Filetransfer: File not found.");
    outgoing_filetransfers.update((transfers) => {
      transfers[filetransfer_index].files![index].completed++;
      return transfers;
    });
    index++;
    if (index < filetransfer.files.length) {
      file = filetransfer.files[index];
    } else {
      return;
    }
  }

  for (let i = 0; i < file.chunks.length; i++) {
    const transfer = get(outgoing_filetransfers).find(
      (transfer) => transfer.id == filetransfer_id,
    );
    if (
      transfer !== undefined &&
      (transfer.cid === undefined || !transfer.completed)
    ) {
      await peer().sendMessage(did, {
        type: "chunk",
        id: filetransfer_id,
        chunk: {
          id: i,
          file_id: file.id,
          data: file.chunks[i],
        },
        final: i + 1 === file.chunks_length ? true : undefined,
      });
    }
  }
};

export const sendMissing = (
  did: number,
  filetransfer_id: string,
  file_id: string,
  missing: number[],
) => {
  const filetransfer = get(outgoing_filetransfers).find(
    (transfer) => transfer.id == filetransfer_id,
  );
  if (filetransfer === undefined) throw new Error("Filetransfer not found.");
  if (filetransfer.files === undefined) throw new Error("Files not chunked.");
  const file = filetransfer.files.find((file) => file.id == file_id);
  if (file === undefined) throw new Error("File not found.");

  for (let i = 0; i < missing.length; i++) {
    peer().sendMessage(did, {
      type: "chunk",
      id: filetransfer_id,
      chunk: {
        id: missing[i],
        file_id: file.id,
        data: file.chunks[missing[i]],
      },
      final: i + 1 === missing.length ? true : undefined,
    });
  }
};

export const sendFinish = async (
  did: number,
  filetransfer_id: string,
  file_id: string,
  filetransfer_finished: boolean,
) => {
  const filetransfer_index = get(incoming_filetransfers).findIndex(
    (transfer) => transfer.id == filetransfer_id,
  );
  if (filetransfer_index === -1) throw new Error("Filetransfer not found.");
  const file_index = get(incoming_filetransfers)[
    filetransfer_index
  ].files.findIndex((file) => file.id == file_id);
  if (file_index === -1) throw new Error("File not found.");

  const missing: number[] = [];
  for (
    let i = 0;
    i <
    get(incoming_filetransfers)[filetransfer_index].files[file_index].chunks
      .length;
    i++
  ) {
    if (
      get(incoming_filetransfers)[filetransfer_index].files[file_index].chunks[
        i
      ] === undefined
    )
      missing.push(i);
  }

  peer().sendMessage(did, {
    type: "file-finish",
    id: filetransfer_id,
    file_id,
    missing: missing.length === 0 ? undefined : missing,
  });

  if (missing.length !== 0) return;

  if (filetransfer_finished) {
    peer().sendMessage(did, {
      type: "transfer-finish",
      id: filetransfer_id,
    });

    deleteNotification(`filetransfer-${filetransfer_id}`);

    incoming_filetransfers.update((transfer) => {
      transfer[filetransfer_index].completed = true;
      return transfer;
    });

    /* if (window.location.pathname.slice(0, 6) == "/guest") {
      closeConnections();
    } */
  }

  const file = concatArrays(
    get(incoming_filetransfers)[filetransfer_index].files[file_index].chunks,
  );

  const url = createFileURL(file);

  incoming_filetransfers.update((filetransfers) => {
    filetransfers[filetransfer_index].files[file_index].url = url;
    return filetransfers;
  });

  addNotification({
    title: "File received",
    body: `The file '${
      get(incoming_filetransfers)[filetransfer_index].files[file_index].name
    }' was received.`,
    tag: `file-${file_id}`,
    data: {
      filename: get(incoming_filetransfers)[filetransfer_index].files[
        file_index
      ].name,
      url: url,
    },
  });
};

// Receiver:
export const sendAnswer = (
  did: number,
  filetransfer_id: string,
  answer: boolean,
) => {
  peer().sendMessage(did, {
    type: answer ? "accept" : "reject",
    id: filetransfer_id,
  });
};
