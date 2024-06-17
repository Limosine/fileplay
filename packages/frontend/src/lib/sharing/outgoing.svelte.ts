import { nanoid } from "nanoid";
import { get } from "svelte/store";

import { apiClient } from "$lib/api/client";
import { peer } from "$lib/lib/p2p";
import {
  contacts,
  devices,
  files,
  groupDevices,
  updateFiles,
  user,
} from "$lib/lib/UI";

import {
  chunkBlobSmall,
  generateInfos,
  type OutgoingFileInfos,
  type OutgoingFileTransfer,
  type Request,
} from "./common";

interface Device {
  did: number;
  online?: boolean;
}

export class FiletransferOut {
  id: OutgoingFileTransfer["id"];
  nid: OutgoingFileTransfer["nid"];
  files = $state<OutgoingFileTransfer["files"]>([]);
  ids: OutgoingFileTransfer["ids"];
  recipients = $state<OutgoingFileTransfer["recipients"]>([]);

  constructor(
    properties: OutgoingFileTransfer["ids"],
    files = generateInfos(),
  ) {
    let selectedDevices: Device[] =
      properties.type == "group"
        ? get(groupDevices).filter((d) => d.gid === properties.id)
        : properties.type == "contact"
          ? get(contacts).find((c) => c.uid === properties.id)?.devices || []
          : properties.type == "devices"
            ? get(devices).others.filter((d) =>
                properties.ids.some((id) => id === d.did),
              )
            : properties.type == "fromGuest"
              ? [{ did: properties.id }]
              : [];

    this.id = properties.type == "toGuest" ? properties.transferId : nanoid();
    this.nid = nanoid();
    this.files = files;
    this.ids = properties;
    this.recipients = selectedDevices.map((d) => {
      const recipient = $state<(typeof this.recipients)[0]>({
        state: "requesting",
        did: d.did,
        online: !(d.online === false),
        filesSent: 0,
      });
      return recipient;
    });

    if (properties.type != "toGuest") {
      this.sendRequest();
      this.sendNotifications();
    }
  }

  async sendNotifications() {
    if (this.ids.type == "fromGuest" || this.ids.type == "toGuest") return;

    apiClient("ws").sendMessage({
      type: "sendNotifications",
      data: {
        type: this.ids.type,
        ids:
          this.ids.type == "devices"
            ? this.recipients.filter((r) => !r.online).map((r) => r.did)
            : [this.ids.id],
        nid: this.nid,
        files: this.files.map((f) => f.name),
      },
    });
  }

  async sendRequest(properties?: {
    type: "notification" | "guest";
    from: number;
  }) {
    const files = this.files.map((f) => {
      return {
        id: f.id,
        name: f.name,
        chunks_length: f.small.chunks_length,
      };
    });

    const request: Request = {
      type: "request",
      id: this.id,
      ids:
        this.ids.type == "group"
          ? this.ids
          : this.ids.type == "contact"
            ? { type: this.ids.type, id: get(user).uid }
            : { type: this.ids.type == "devices" ? "device" : "guest" },
      files,
      previous: this.ids.type == "fromGuest" ? this.ids.previous : undefined,
      nid: properties?.type == "notification" ? this.nid : undefined,
    };

    if (properties === undefined) {
      for (const recipient of this.recipients) {
        await get(peer).sendMessage(recipient.did, request);
      }
    } else {
      if (!this.recipients.some((r) => r.did === properties.from)) {
        this.recipients.push({
          state: "requesting",
          did: properties.from,
          online: true,
          filesSent: 0,
        });
      }

      await get(peer).sendMessage(properties.from, request);
    }
  }

  async sendChunked(did: number, previousFileId?: string) {
    let file_index: number;
    let file: OutgoingFileInfos;

    if (previousFileId === undefined) {
      const recipient = this.recipients.find((r) => r.did === did);
      if (recipient !== undefined) recipient.state = "sending";

      file_index = 0;
    } else {
      file_index = this.files.findIndex((file) => file.id == previousFileId);
      if (file_index === -1) throw new Error("Filetransfer: File not found.");

      this.files[file_index].completed++;
      file_index++;
    }

    if (file_index < this.files.length) {
      file = this.files[file_index];
    } else return;

    for (let i = 0; i < file.bigChunks.length; i++) {
      const index = get(files).findIndex((f) => f.id == file.id);
      if (index === -1) console.warn("Filetransfer: Unable to cache chunks.");

      const smallChunks =
        index === -1 ? undefined : get(files)[index].smallChunks;
      let chunks: Uint8Array[];
      if (smallChunks === undefined || smallChunks[i] === undefined) {
        // Split the large chunks into small chunks (16 KB)
        chunks = await chunkBlobSmall(file.bigChunks[i]);

        // Cache small chunks (in case chunks are missing)
        if (this.files[file_index].small.chunks === undefined)
          this.files[file_index].small.chunks = [];
        this.files[file_index].small.chunks![i] = chunks;

        // Cache small chunks (for transfer to another device)
        if (index !== -1) {
          updateFiles((files) => {
            if (files[index].smallChunks === undefined)
              files[index].smallChunks = [];
            files[index].smallChunks![i] = chunks;
            return files;
          });
        }
      } else {
        chunks = smallChunks[i];
      }

      let rejected = false;
      for (let j = 0; !rejected && j < chunks.length; j++) {
        // Check whether the transfer has been rejected/canceled

        if (
          this.recipients.some((r) => r.did === did && r.state == "sending")
        ) {
          await get(peer).sendMessage(did, {
            type: "chunk",
            id: this.id,
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
        } else rejected = true;
      }
    }
  }

  async sendMissing(did: number, file_id: string, missing: number[]) {
    const file = this.files.find((file) => file.id == file_id);
    if (file === undefined) throw new Error("File not found.");

    const chunks = file.small.chunks;
    if (chunks === undefined)
      throw new Error("Filetransfer: Chunks not cached.");

    for (let i = 0; i < missing.length; i++) {
      const bigChunk = Math.floor(missing[i] / 1000);
      await get(peer).sendMessage(did, {
        type: "chunk",
        id: this.id,
        chunk: {
          id: missing[i],
          file_id: file.id,
          data: chunks[bigChunk][missing[i] - 1000 * bigChunk],
        },
        final: i + 1 === missing.length ? true : undefined,
      });
    }
  }

  async handleFileFinish(did: number, file_id: string, missing?: number[]) {
    const recipient = this.recipients.find((r) => r.did === did);
    if (recipient !== undefined) ++recipient.filesSent;

    if (missing) {
      await this.sendMissing(did, file_id, missing);
    } else {
      await this.sendChunked(did, file_id);
    }
  }

  handleFileTransferFinished(
    did: number,
    state: "rejected" | "sent" | "canceled",
  ) {
    const recipient = this.recipients.find((r) => r.did === did);

    if (recipient !== undefined) {
      recipient.state = state;
    }
  }
}
