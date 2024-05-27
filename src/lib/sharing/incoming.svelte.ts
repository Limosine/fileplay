import { peer } from "$lib/lib/p2p";
import { onGuestPage } from "$lib/lib/utils";

import {
  concatUint8Arrays,
  createFileURL,
  type IncomingFiletransfer,
  type Request,
} from "./common";
import { manager } from "./manager.svelte";

export class FiletransferIn {
  id: IncomingFiletransfer["id"];
  did: IncomingFiletransfer["did"];
  files = $state<IncomingFiletransfer["files"]>([]);
  ids: IncomingFiletransfer["ids"];
  state = $state<IncomingFiletransfer["state"]>("infos");

  constructor(
    id: IncomingFiletransfer["id"],
    did: IncomingFiletransfer["did"],
    filesUnformatted: Request["files"],
    ids: IncomingFiletransfer["ids"],
    nid?: string,
  ) {
    this.id = id;
    this.did = did;
    this.files = filesUnformatted.map((file) => {
      const formatted = $state<(typeof this.files)[0]>({
        id: file.id,
        name: file.name,
        chunks_length: file.chunks_length,
        chunks: [],
      });
      return formatted;
    });
    this.ids = ids;

    if (
      onGuestPage() ||
      (nid !== undefined && manager.knownNotification(this.did, nid))
    )
      this.sendAnswer(true);
  }

  sendAnswer(answer: boolean) {
    if (this.state == "infos" || this.state == "receiving")
      peer().sendMessage(this.did, {
        type: answer ? "accept" : "reject",
        id: this.id,
      });

    if (answer) this.state = "receiving";
    else manager.incoming = manager.incoming.filter((t) => t.id != this.id);
  }

  sendFinish(file_id: string, filetransfer_finished: boolean) {
    const file_index = this.files.findIndex((file) => file.id == file_id);
    if (file_index === -1) throw new Error("File not found.");

    const missing: number[] = [];
    for (let i = 0; i < this.files[file_index].chunks.length; i++) {
      if (this.files[file_index].chunks[i] === undefined) missing.push(i);
    }

    peer().sendMessage(this.did, {
      type: "file-finish",
      id: this.id,
      file_id,
      missing: missing.length === 0 ? undefined : missing,
    });

    if (missing.length !== 0) return;

    if (filetransfer_finished) {
      peer().sendMessage(this.did, {
        type: "transfer-finish",
        id: this.id,
      });

      this.state = "received";
    }

    const file = concatUint8Arrays(this.files[file_index].chunks);

    this.files[file_index].url = createFileURL(file);
  }

  handleChunk(
    file_id: string,
    chunk: Uint8Array,
    chunk_id: number,
    final?: boolean,
  ) {
    const file_index = this.files.findIndex((file) => file.id == file_id);
    if (file_index === -1) throw new Error("Filetransfer: No such file");

    this.files[file_index].chunks[chunk_id] = chunk;

    if (final) {
      if (this.files.slice(-1)[0].id === file_id) {
        this.sendFinish(file_id, true);
      } else {
        this.sendFinish(file_id, false);
      }
    }
  }

  getProgress(file_id?: string) {
    let received_chunks = 0;
    let total_chunks = 0;

    if (file_id === undefined) {
      this.files.forEach((file) => {
        received_chunks = received_chunks + file.chunks.length;
        total_chunks = total_chunks + file.chunks_length;
      });
    } else {
      const file = this.files.find((f) => f.id == file_id);
      if (file !== undefined) {
        received_chunks = file.chunks.length;
        total_chunks = file.chunks_length;
      }
    }

    return total_chunks === 0 ? 0 : received_chunks / total_chunks;
  }
}
