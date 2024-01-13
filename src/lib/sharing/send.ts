import { page } from "$app/stores";
import { nanoid } from "nanoid";
import { get } from "svelte/store";

import {
  decryptFiles,
  decryptFilesWithPassword,
  encryptFiles,
  encryptFilesWithPassword,
} from "$lib/lib/openpgp";
import { SendState, sendState } from "$lib/lib/sendstate";
import { closeConnections, sendMessage } from "$lib/lib/simple-peer";
import { addNotification, deleteNotification, own_did } from "$lib/lib/UI";

import {
  chunkFiles,
  incoming_filetransfers,
  outgoing_filetransfers,
  type FileInfos,
  type OutgoingFileTransfer,
  createFileURL,
  type Request,
} from "./common";

// Sender:
export const send = async (
  files: FileList,
  did?: number,
  cid?: number,
  publicKey?: string,
  filetransfer_id?: string,
) => {
  if (files.length <= 0)
    throw new Error("Filetransfer: One file has to be selected.");

  let filetransfer_infos: OutgoingFileTransfer;

  let encrypted_files: string[];
  if (publicKey !== undefined) {
    encrypted_files = (await encryptFiles(files, publicKey)).map((file) =>
      file.toString(),
    );
    filetransfer_infos = {
      id: nanoid(),
      encrypted: "publicKey",
      completed: false,
      files: chunkFiles(files, encrypted_files),
      cid,
      did,
    };
  } else {
    let filetransferID: string;
    if (filetransfer_id === undefined) {
      filetransferID = nanoid();
    } else {
      filetransferID = filetransfer_id;
    }

    encrypted_files = (
      await encryptFilesWithPassword(files, filetransferID)
    ).map((file) => file.toString());
    filetransfer_infos = {
      id: filetransferID,
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

  if (did !== undefined) {
    sendRequest(did, filetransfer_infos.id);
  }

  return filetransfer_infos.id;
};

export const sendRequest = (did: number, filetransfer_id: string) => {
  const outgoing_filetransfer = get(outgoing_filetransfers).find(
    (outgoing_filetransfer) => outgoing_filetransfer.id == filetransfer_id,
  );

  if (outgoing_filetransfer !== undefined) {
    const files: Request["files"] = [];

    outgoing_filetransfer.files.forEach((file) => {
      files.push({
        id: file.id,
        name: file.name,
        chunks_length: file.chunks.length,
      });
    });

    sendMessage(
      {
        type: "request",
        id: outgoing_filetransfer.id,
        encrypted: outgoing_filetransfer.encrypted,
        files,
        did: get(own_did),
      },
      did,
    );
  } else {
    console.log("Filetransfer: Wrong filetransfer id.");
  }
};

export const sendChunked = (
  did: number,
  filetransfer_id: string,
  previous_file_id?: string,
) => {
  const filetransfer_index = get(outgoing_filetransfers).findIndex(
    (transfer) => transfer.id == filetransfer_id,
  );

  if (filetransfer_index === -1) {
    throw new Error("Filetransfer: Filetransfer not found.");
  }

  let file: Omit<FileInfos, "url">;
  if (previous_file_id === undefined) {
    const cid = get(outgoing_filetransfers)[filetransfer_index].cid;
    if (cid !== undefined) sendState.setSendState(cid, SendState.SENDING);
    file = get(outgoing_filetransfers)[filetransfer_index].files[0];
  } else {
    let index = get(outgoing_filetransfers)[filetransfer_index].files.findIndex(
      (file) => file.id == previous_file_id,
    );
    if (index === -1) throw new Error("Filetransfer: File not found.");
    outgoing_filetransfers.update(transfers => {
      transfers[filetransfer_index].files[index].completed++;
      return transfers;
    });
    index++;
    if (index < get(outgoing_filetransfers)[filetransfer_index].files.length) {
      file = get(outgoing_filetransfers)[filetransfer_index].files[index];
    } else {
      return;
    }
  }

  for (let i = 0; i < file.chunks.length; i++) {
    sendMessage(
      {
        type: "chunk",
        id: filetransfer_id,
        chunk: {
          id: i,
          file_id: file.id,
          data: file.chunks[i],
        },
        final: i + 1 === file.chunks_length ? true : undefined,
        did: get(own_did),
      },
      did,
    );
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
  const file = filetransfer.files.find((file) => file.id == file_id);
  if (file === undefined) throw new Error("File not found.");

  for (let i = 0; i < missing.length; i++) {
    sendMessage(
      {
        type: "chunk",
        id: filetransfer_id,
        chunk: {
          id: missing[i],
          file_id: file.id,
          data: file.chunks[missing[i]],
        },
        final: i + 1 === missing.length ? true : undefined,
        did: get(own_did),
      },
      did,
    );
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

  sendMessage(
    {
      type: "file-finish",
      id: filetransfer_id,
      file_id,
      missing: missing.length === 0 ? undefined : missing,
      did: get(own_did),
    },
    did,
  );

  if (missing.length !== 0) return;

  if (filetransfer_finished) {
    sendMessage(
      {
        type: "transfer-finish",
        id: filetransfer_id,
        did: get(own_did),
      },
      did,
    );

    deleteNotification(`filetransfer-${filetransfer_id}`);

    incoming_filetransfers.update((transfer) => {
      transfer[filetransfer_index].completed = true;
      return transfer;
    });

    if (window.location.pathname.slice(0, 6) == "/guest") {
      closeConnections();
    }
  }

  const encryptedFile = get(incoming_filetransfers)[filetransfer_index].files[
    file_index
  ].chunks.join("");

  let decryptedFile;
  if (
    get(incoming_filetransfers)[filetransfer_index].encrypted == "publicKey"
  ) {
    decryptedFile = await decryptFiles([encryptedFile]);
  } else {
    decryptedFile = await decryptFilesWithPassword(
      [encryptedFile],
      get(page).params.filetransfer_id,
    );
  }

  const url = createFileURL(decryptedFile[0]);

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
    actions: [{ title: "Download", action: "download" }],
    data: {
      filename: get(incoming_filetransfers)[filetransfer_index].files[
        file_index
      ].name,
      url: url,
    },
  });
};

// Receiver:
export const sendAccept = (did: number, filetransfer_id: string) => {
  sendMessage(
    {
      type: "accept",
      id: filetransfer_id,
      did: get(own_did),
    },
    did,
  );
};
