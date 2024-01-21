import { browser } from "$app/environment";
import { get } from "svelte/store";

import { sendState, SendState } from "$lib/lib/sendstate";
import { addNotification } from "$lib/lib/UI";

import {
  incoming_filetransfers,
  type IncomingFiletransfer,
  outgoing_filetransfers,
  type Request,
} from "./common";
import { sendAccept, sendChunked, sendFinish, sendMissing } from "./send";

export const handleRequest = (
  did: number,
  filetransfer_id: string,
  files_unformatted: Request["files"],
) => {
  if (browser && window.location.pathname.slice(0, 6) == "/guest") {
    const files: IncomingFiletransfer["files"] = [];

    files_unformatted.forEach((file) => {
      files.push({
        id: file.id,
        name: file.name,
        chunks_length: file.chunks_length,
        chunks: [],
      });
    });

    const filetransfer: IncomingFiletransfer = {
      id: filetransfer_id,
      completed: false,
      files,
      did,
    };

    incoming_filetransfers.set([...get(incoming_filetransfers), filetransfer]);

    sendAccept(did, filetransfer_id);
  } else {
    addNotification({
      title: "File request",
      body: `The file(s) '${files_unformatted
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

  if (filetransfer_index !== -1) {
    const file_index = get(incoming_filetransfers)[
      filetransfer_index
    ].files.findIndex((file) => file.id == file_id);

    if (file_index !== -1) {
      incoming_filetransfers.update((filetransfers) => {
        filetransfers[filetransfer_index].files[file_index].chunks[chunk_id] =
          chunk;
        return filetransfers;
      });

      if (final) {
        if (
          get(incoming_filetransfers)[filetransfer_index].files.slice(-1)[0]
            .id === file_id
        ) {
          sendFinish(did, filetransfer_id, file_id, true);
        } else {
          sendFinish(did, filetransfer_id, file_id, false);
        }
      }
    } else throw new Error("Filetransfer: No such file");
  } else throw new Error("Filetransfer: No such filetransfer");
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

export const handleFileTransferFinished = (filetransfer_id: string) => {
  const filetransfer = get(outgoing_filetransfers).find(
    (filetransfer) => filetransfer.id == filetransfer_id,
  );

  if (filetransfer !== undefined && filetransfer.cid !== undefined) {
    sendState.setSendState(Number(filetransfer.cid), SendState.SENT);

    outgoing_filetransfers.update((filetransfers) =>
      filetransfers.filter(
        (filetransfer) => filetransfer.id != filetransfer_id,
      ),
    );
  }
};
