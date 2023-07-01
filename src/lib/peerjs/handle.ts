import { get } from "svelte/store";
import { createFileURL, received_chunks } from "./common";
import { decryptFiles, decryptFilesWithPassword } from "$lib/openpgp";
import { page } from "$app/stores";

export const handleFinish = async (data: any) => {
  let index = get(received_chunks).findIndex(received_file_chunks => received_file_chunks.file_id == data.file_id);

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

  received_chunks.update((received_chunks) => { received_chunks[index].url = url; return received_chunks; });
};

export const handleFileInfos = (data: any) => {
  data.files.forEach((file: any) => {
    let initial_chunk = {
      file_id: file.file_id,
      file_name: file.file_name,
      encrypted: data.encrypted,
      chunk_number: file.chunk_number,
      chunks: []
    };

    received_chunks.set([...get(received_chunks), initial_chunk]);
  });
};

export const handleChunk = (
  chunk: string,
  file_id: string
) => {
  let index = get(received_chunks).findIndex(received_file_chunks => received_file_chunks.file_id == file_id);

  if (index !== undefined) {
    received_chunks.update((received_chunks) => { received_chunks[index].chunks.push(chunk); return received_chunks; });
  } else {
    console.log("No such file");
  }
};

