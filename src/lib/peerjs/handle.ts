import { get } from "svelte/store";
import { createFileURL, pending_filetransfers, received_chunks } from "./common";
import { decryptFiles, decryptFilesWithPassword } from "$lib/lib/openpgp";
import { page } from "$app/stores";
import { sendState, SendState } from "$lib/lib/sendstate";
import { sendChunk, sendFinish } from "./send";
import { addNotification, deleteNotification } from "$lib/lib/UI";

export const handleChunkFinish = (peerID: string, filetransfer_id: string, file_id: string, chunk_id: number) => {
  let chunk_info:
    | {
        file_id: string;
        chunk_id: number;
        chunk: string;
      }
    | undefined;
  let file_finished: string | undefined;
  let file_transfer_finished: string | undefined;

  let next_chunk_id = chunk_id + 1;

  for (let i = 0; i < get(pending_filetransfers).length; i++) {
    if (get(pending_filetransfers)[i].filetransfer_id == filetransfer_id) {
      for (let j = 0; j < get(pending_filetransfers)[i].files.length; j++) {
        let pending_file = get(pending_filetransfers)[i].files[j];

        if (pending_file.file_id == file_id) {
          if (next_chunk_id < pending_file.file.length) {
            pending_filetransfers.update((pending_filetransfers_self) => {
              pending_filetransfers_self[i].files[j].chunks++;
              return pending_filetransfers_self;
            });

            chunk_info = {
              file_id: pending_file.file_id,
              chunk_id: next_chunk_id,
              chunk: pending_file.file[next_chunk_id],
            };
          } else {
            pending_filetransfers.update((pending_filetransfers_self) => {
              pending_filetransfers_self[i].files[j].chunks = pending_filetransfers_self[i].files[j].file.length;
              return pending_filetransfers_self;
            });

            file_finished = pending_file.file_id;

            if ((j + 1) < get(pending_filetransfers)[i].files.length) {
              let next_file = get(pending_filetransfers)[i].files[j+1];
              chunk_info = {
                file_id: next_file.file_id,
                chunk_id: 0,
                chunk: next_file.file[0],
              };
            } else {
              pending_filetransfers.update((pending_filetransfers_self) => {
                pending_filetransfers_self[i].completed = true;
                return pending_filetransfers_self;
              });

              file_transfer_finished = get(pending_filetransfers)[i].filetransfer_id;
              sendState.setSendState(Number(get(pending_filetransfers)[i].cid), SendState.SENT);
            }
          }
        }
      }
    }
  }

  if (file_finished !== undefined && file_transfer_finished !== undefined) {
    sendFinish(peerID, file_finished, file_transfer_finished);
  } else if (file_finished !== undefined) {
    sendFinish(peerID, file_finished);
  }

  if (chunk_info !== undefined) {
    sendChunk(peerID, filetransfer_id, chunk_info);
  }
}

export const handleFinish = async (data: any) => {
  let index = get(received_chunks).findIndex(
    (received_file_chunks) => received_file_chunks.file_id == data.file_id
  );

  let file = get(received_chunks)[index].chunks.join("");

  let decrypted_file;
  if (get(received_chunks)[index].encrypted == "publicKey") {
    decrypted_file = await decryptFiles([file]);
  } else {
    decrypted_file = await decryptFilesWithPassword(
      [file],
      get(page).params.listen_key
    );
  }

  let url = createFileURL(decrypted_file[0]);

  received_chunks.update((received_chunks) => {
    received_chunks[index].url = url;
    return received_chunks;
  });

  deleteNotification(`file-${get(received_chunks)[index].file_id}`);
  addNotification({title: "File received", body: `The file '${get(received_chunks)[index].file_name}' was received.`, tag: `file-${get(received_chunks)[index].file_id}`, actions: [{title: "Download", action: "download"}], data: { filename: get(received_chunks)[index].file_name, url: url}});
};

export const handleFileInfos = (data: any) => {
  data.files.forEach((file: any) => {
    let initial_chunk_info = {
      file_id: file.file_id,
      file_name: file.file_name,
      encrypted: data.encrypted,
      chunk_number: file.chunk_number,
      chunks: [],
    };

    received_chunks.set([...get(received_chunks), initial_chunk_info]);

    addNotification({title: "Receiving file", body: `The file '${file.file_name}' is being received.`, tag: `file-${file.file_id}`, actions: [{title: "Cancel", action: "cancel"}], data: { file_id: file.file_id}});
  });
};

export const handleChunk = (chunk: string, file_id: string) => {
  let index = get(received_chunks).findIndex(
    (received_file_chunks) => received_file_chunks.file_id == file_id
  );

  if (index !== undefined) {
    received_chunks.update((received_chunks) => {
      received_chunks[index].chunks.push(chunk);
      return received_chunks;
    });
  } else {
    console.log("PeerJS: No such file");
  }
};
