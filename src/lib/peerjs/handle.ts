import { get } from "svelte/store";
import { page } from "$app/stores";
import { browser } from "$app/environment";

import { decryptFiles, decryptFilesWithPassword } from "$lib/lib/openpgp";
import { sendState, SendState } from "$lib/lib/sendstate";
import { addNotification, deleteNotification } from "$lib/lib/UI";

import {
  createFileURL,
  incoming_filetransfers,
  outgoing_filetransfers,
} from "./common";
import { disconnectPeer } from "./main";
import { sendAccept, sendChunk, sendFinish } from "./send";

export const handleRequest = (
  peerID: string,
  filetransfer_id: string,
  encrypted: "password" | "publicKey",
  files_unformatted: IFileInfo[],
  did: number,
) => {
  if (browser && window.location.pathname.slice(0, 6) == "/guest") {
    const files: IIncomingFiletransfer["files"] = [];

    files_unformatted.forEach((file) => {
      files.push({
        file_id: file.file_id,
        file_name: file.file_name,
        chunk_number: file.chunk_number,
        chunks: [],
      });
    });

    const filetransfer: IIncomingFiletransfer = {
      filetransfer_id: filetransfer_id,
      encrypted,
      completed: false,
      files,
      did,
    };

    incoming_filetransfers.set([...get(incoming_filetransfers), filetransfer]);

    sendAccept(peerID, filetransfer_id);
  } else {
    addNotification({
      title: "File request",
      body: `The file(s) '${files_unformatted
        .map((file) => file.file_name)
        .toString()}' can be received.`,
      tag: `filetransfer-${filetransfer_id}`,
      actions: [
        { title: "Accept", action: "accept" },
        { title: "Cancel", action: "cancel" },
      ],
      data: {
        peerID: peerID,
        filetransfer_id: filetransfer_id,
        files: files_unformatted,
        encrypted: encrypted,
        did: did,
      },
    });
  }
};

export const handleChunk = (
  filetransfer_id: string,
  file_id: string,
  chunk: string,
) => {
  const filetransfer_index = get(incoming_filetransfers).findIndex(
    (filetransfer) => filetransfer.filetransfer_id == filetransfer_id,
  );

  if (filetransfer_index != -1) {
    const file_index = get(incoming_filetransfers)[
      filetransfer_index
    ].files.findIndex((file) => file.file_id == file_id);

    if (file_index != -1) {
      incoming_filetransfers.update((filetransfers) => {
        filetransfers[filetransfer_index].files[file_index].chunks.push(chunk);
        return filetransfers;
      });
    } else console.log("PeerJS: No such file");
  } else console.log("PeerJS: No such filetransfer");
};

export const handleChunkFinish = (
  peerID: string,
  filetransfer_id: string,
  file_id: string,
  chunk_id: number,
) => {
  let chunk_info:
    | {
        file_id: string;
        chunk_id: number;
        chunk: string;
      }
    | undefined;
  let file_finished: string | undefined;
  let filetransfer_finished = false;

  const next_chunk_id = chunk_id + 1;

  for (let i = 0; i < get(outgoing_filetransfers).length; i++) {
    if (get(outgoing_filetransfers)[i].filetransfer_id == filetransfer_id) {
      for (let j = 0; j < get(outgoing_filetransfers)[i].files.length; j++) {
        const pending_file = get(outgoing_filetransfers)[i].files[j];

        if (pending_file.file_id == file_id) {
          if (next_chunk_id < pending_file.file.length) {
            outgoing_filetransfers.update((outgoing_filetransfers_self) => {
              outgoing_filetransfers_self[i].files[j].chunks++;
              return outgoing_filetransfers_self;
            });

            chunk_info = {
              file_id: pending_file.file_id,
              chunk_id: next_chunk_id,
              chunk: pending_file.file[next_chunk_id],
            };
          } else {
            outgoing_filetransfers.update((outgoing_filetransfers_self) => {
              outgoing_filetransfers_self[i].files[j].chunks =
                outgoing_filetransfers_self[i].files[j].file.length;
              return outgoing_filetransfers_self;
            });

            console.log("File finished.");
            file_finished = pending_file.file_id;

            if (j + 1 < get(outgoing_filetransfers)[i].files.length) {
              const next_file = get(outgoing_filetransfers)[i].files[j + 1];
              chunk_info = {
                file_id: next_file.file_id,
                chunk_id: 0,
                chunk: next_file.file[0],
              };
            } else {
              outgoing_filetransfers.update((outgoing_filetransfers_self) => {
                outgoing_filetransfers_self[i].completed = true;
                return outgoing_filetransfers_self;
              });

              console.log("FileTransfer finished.");
              filetransfer_finished = true;
              sendState.setSendState(
                Number(get(outgoing_filetransfers)[i].cid),
                SendState.SENT,
              );
            }
          }
        }
      }
    }
  }

  if (file_finished !== undefined) {
    sendFinish(peerID, filetransfer_id, file_finished, filetransfer_finished);
  }

  if (chunk_info !== undefined) {
    sendChunk(peerID, filetransfer_id, chunk_info);
  }
};

export const handleFileFinish = async (
  filetransfer_id: string,
  file_id: string,
) => {
  const filetransfer_index = get(incoming_filetransfers).findIndex(
    (filetransfer) => filetransfer.filetransfer_id == filetransfer_id,
  );

  if (filetransfer_index != -1) {
    const file_index = get(incoming_filetransfers)[
      filetransfer_index
    ].files.findIndex((file) => file.file_id == file_id);

    if (file_index != -1) {
      const file = get(incoming_filetransfers)[filetransfer_index].files[
        file_index
      ].chunks.join("");

      let decrypted_file;
      if (
        get(incoming_filetransfers)[filetransfer_index].encrypted == "publicKey"
      ) {
        decrypted_file = await decryptFiles([file]);
      } else {
        decrypted_file = await decryptFilesWithPassword(
          [file],
          get(page).params.filetransfer_id,
        );
      }

      const url = createFileURL(decrypted_file[0]);

      incoming_filetransfers.update((filetransfers) => {
        filetransfers[filetransfer_index].files[file_index].url = url;
        return filetransfers;
      });

      addNotification({
        title: "File received",
        body: `The file '${
          get(incoming_filetransfers)[filetransfer_index].files[file_index]
            .file_name
        }' was received.`,
        tag: `file-${file_id}`,
        actions: [{ title: "Download", action: "download" }],
        data: {
          filename: get(incoming_filetransfers)[filetransfer_index].files[
            file_index
          ].file_name,
          url: url,
        },
      });
    } else console.log("PeerJS: No such file");
  } else console.log("PeerJS: No such filetransfer");
};

export const handleFileTransferFinished = (filetransfer_id: string) => {
  incoming_filetransfers.update((filetransfers) => {
    const filetransfer_index = filetransfers.findIndex(
      (filetransfer) => filetransfer.filetransfer_id == filetransfer_id,
    );
    filetransfers[filetransfer_index].completed = true;

    return filetransfers;
  });

  deleteNotification(`filetransfer-${filetransfer_id}`);

  if (browser && window.location.pathname.slice(0, 6) == "/guest") {
    disconnectPeer(true);
  }
};
