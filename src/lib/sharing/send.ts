import { page } from "$app/stores";
import { nanoid } from "nanoid";
import { get } from "svelte/store";

import { SendState, sendState } from "$lib/lib/sendstate";
import { peer } from "$lib/lib/simple-peer";
import { addNotification, deleteNotification, files } from "$lib/lib/UI";

import {
  incoming_filetransfers,
  outgoing_filetransfers,
  createFileURL,
  type Request,
  concatArrays,
  type OutgoingFileInfos,
  type OutgoingFileTransfer,
  chunkFileBig,
  chunkBlobSmall,
} from "./common";

// Sender:
export const send = async (
  did?: number,
  cid?: number,
  filetransfer_id?: string,
) => {
  if (get(files).length <= 0)
    throw new Error("Filetransfer: One file has to be selected.");

  filetransfer_id = filetransfer_id === undefined ? nanoid() : filetransfer_id;

  const fileInfos: OutgoingFileInfos[] = [];
  for (let i = 0; i < get(files).length; i++) {
    let bigChunks = get(files)[i].bigChunks;

    if (bigChunks === undefined) {
      bigChunks = chunkFileBig(get(files)[i].file);
      files.update((files) => {
        files[i].bigChunks = bigChunks;
        return files;
      });
    }

    fileInfos.push({
      id: get(files)[i].id,
      name: get(files)[i].file.name,
      bigChunks,
      small: {
        chunks_length: Math.ceil(get(files)[i].file.size / (16 * 1024)),
      },
      completed: 0,
    });
  }

  const filetransfer_infos: OutgoingFileTransfer = {
    id: filetransfer_id,
    files: fileInfos,
    completed: false,
    cid,
    did,
  };

  outgoing_filetransfers.update((transfers) => {
    transfers.push(filetransfer_infos);
    return transfers;
  });

  if (cid !== undefined) {
    sendState.set(cid, SendState.REQUESTING);
  }

  const previous = get(page).url.searchParams.get("id");

  if (did !== undefined) {
    sendRequest(did, filetransfer_id, previous === null ? undefined : previous);
  }

  return filetransfer_id;
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
    const files: Request["files"] = [];

    outgoing_filetransfer.files.forEach((file) => {
      files.push({
        id: file.id,
        name: file.name,
        chunks_length: file.small.chunks_length,
      });
    });

    peer().sendMessage(did, {
      type: "request",
      id: outgoing_filetransfer.id,
      files,
      previous,
    });
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

  let file: OutgoingFileInfos;
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

  for (let i = 0; i < file.bigChunks.length; i++) {
    const transfer = get(outgoing_filetransfers).find(
      (transfer) => transfer.id == filetransfer_id,
    );
    if (
      transfer !== undefined &&
      (transfer.cid === undefined || !transfer.completed)
    ) {
      const index = get(files).findIndex((f) => f.id == file.id);
      if (index === -1) console.warn("Filetransfer: Unable to cache chunks");

      const smallChunks =
        index === -1 ? undefined : get(files)[index].smallChunks;
      let chunks: Uint8Array[];
      if (smallChunks === undefined || smallChunks[i] === undefined) {
        chunks = await chunkBlobSmall(file.bigChunks[i]);

        if (index !== -1) {
          files.update((files) => {
            if (files[i].smallChunks === undefined) files[i].smallChunks = [];
            files[i].smallChunks![i] = chunks;
            return files;
          });
        }
      } else {
        chunks = smallChunks[i];
      }

      for (let j = 0; j < chunks.length; j++) {
        await peer().sendMessage(did, {
          type: "chunk",
          id: filetransfer_id,
          chunk: {
            id: i * 1000 + j,
            file_id: file.id,
            data: chunks[j],
          },
          final:
            i + 1 === file.bigChunks.length && j + 1 === chunks.length
              ? true
              : undefined,
        });
      }
    }
  }
};

export const sendMissing = async (
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

  const chunks = file.small.chunks;
  if (chunks === undefined) throw new Error("Filetransfer: Chunks not cached.");

  for (let i = 0; i < missing.length; i++) {
    const bigChunk = Math.floor(missing[i] / 1000);
    peer().sendMessage(did, {
      type: "chunk",
      id: filetransfer_id,
      chunk: {
        id: missing[i],
        file_id: file.id,
        data: chunks[bigChunk][missing[i] - 1000 * bigChunk],
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
