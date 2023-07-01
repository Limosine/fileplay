import { get } from "svelte/store";
import { createFileURL, received_chunks, received_files } from "./common";
import { decryptFiles, decryptFilesWithPassword } from "$lib/openpgp";
import { page } from "$app/stores";

export const handleFinish = (data: any) => {
  let file: string;

  get(received_chunks).forEach(async (received_file_chunks) => {
    if (received_file_chunks.file_id == data.file_id) {
      file = received_file_chunks.chunks.join("");

      let decrypted_file;
      if (received_file_chunks.encrypted == "publicKey") {
        decrypted_file = await decryptFiles([file]);
      } else {
        decrypted_file = await decryptFilesWithPassword(
          [file],
          get(page).params.listen_key
        );
      }

      let url = createFileURL(decrypted_file[0]);
      let info = {
        url: url,
        name: received_file_chunks.file_name,
      };

      // Todo: remove item from received_chunks array.

      received_files.set([...get(received_files), info]);
    }
  });
};

export const handleFileInfos = (data: any) => {
  data.files.forEach((file: any) => {
    let initial_chunk = {
      file_id: file.file_id,
      file_name: file.file_name,
      encrypted: data.encrypted,
      chunk_number: file.chunk_number,
      chunks: []
    }

    received_chunks.set([...get(received_chunks), initial_chunk]);
  });
};

export const handleChunk = (
  chunk: string,
  file_id: string
) => {
  let received_file_chunks = get(received_chunks).find(received_file_chunks => received_file_chunks.file_id == file_id);

  if (received_file_chunks !== undefined) {
    received_file_chunks.chunks.push(chunk);
  } else {
    console.log("No such file");
  }
};

