import { page } from "$app/stores";
import { get } from "svelte/store";

import { apiClient } from "$lib/api/client";
import { increaseCounter } from "$lib/lib/history";
import { peer } from "$lib/lib/simple-peer";
import { contacts, devices, groupDevices, groups } from "$lib/lib/UI";
import { onGuestPage } from "$lib/lib/utils";

import type {
  OutgoingFileInfos,
  OutgoingFileTransfer,
  Request,
  Update,
  webRTCData,
} from "./common";
import { FiletransferIn } from "./incoming.svelte";
import { FiletransferOut } from "./outgoing.svelte";

class TransferManager {
  outgoing = $state<FiletransferOut[]>([]);
  incoming = $state<FiletransferIn[]>([]);

  private notifications: { did: number; id: string }[] = [];

  // Initiating/Authorizing new filetransfer (Sender)
  createTransfer(
    properties: OutgoingFileTransfer["ids"],
    files?: OutgoingFileInfos[],
  ) {
    if (properties.type == "devices") {
      for (const device of properties.ids) increaseCounter("device", device);
    } else if (properties.type == "contact" || properties.type == "group")
      increaseCounter(properties.type, properties.id);

    this.outgoing.push(new FiletransferOut(properties, files));
  }

  async createGuestTransfer(send: boolean) {
    const transferId = await apiClient("ws").sendMessage({
      type: "createTransfer",
    });

    this.createTransfer({ type: "toGuest", transferId }, send ? undefined : []);

    return `${location.protocol}//${location.host}/guest?did=${get(devices)?.self.did}&id=${transferId}${send ? "" : "&sender"}`;
  }

  // Handling/Accepting new filetransfer (Receiver)
  handleRequest(did: number, data: Request) {
    this.incoming.push(
      new FiletransferIn(data.id, did, data.files, data.ids, data.nid),
    );
  }

  requestRequest(did: number, filetransfer_id: string) {
    peer().sendMessage(did, {
      type: "accept",
      id: filetransfer_id,
      guest: true,
    });
  }

  // Notifications
  knownNotification = (did: number, nid: string) => {
    return this.notifications.some(
      (request) => request.id == nid && request.did === did,
    );
  };

  private sendReady(did: number, nid: string) {
    this.notifications.push({
      did,
      id: nid,
    });

    peer().sendMessage(did, {
      type: "ready",
      id: nid,
    });
  }

  awaitReady(did: number, nid: string) {
    if (get(contacts).length > 0 || get(groups).length > 0)
      this.sendReady(did, nid);
    else {
      const handle = async (array: unknown[]) => {
        if (array.length > 0) {
          unsubscribeContacts();
          unsubscribeGroups();
          this.sendReady(did, nid);
        }
      };

      const unsubscribeContacts = contacts.subscribe(handle);
      const unsubscribeGroups = groups.subscribe(handle);
    }
  }

  // Helpers (Authentication, etc.)
  private authenticated(
    did: number,
    filetransfer_id: string,
    type: webRTCData["type"],
    previous?: string,
    ids?: Request["ids"],
  ) {
    // Guest page
    if (onGuestPage()) {
      if (Number(get(page).url.searchParams.get("did")) === did) {
        return true;
      } else return false;
    }

    // Notification request - Authorization is checked in handler
    if (type == "ready") return true;

    // Home page - Skip if sending via link or filetransfer is already running
    if (
      this.outgoing.some(
        (filetransfer) =>
          (previous !== undefined &&
            type == "request" &&
            filetransfer.id == previous &&
            filetransfer.ids.type == "toGuest") ||
          (filetransfer.id == filetransfer_id &&
            (filetransfer.ids.type == "toGuest" ||
              filetransfer.recipients.some((r) => r.did === did))),
      )
    )
      return true;

    // Home page - Skip if filetransfer is already running
    if (
      this.incoming.some(
        (filetransfer) =>
          filetransfer.state == "receiving" &&
          filetransfer.id == filetransfer_id &&
          filetransfer.did === did,
      )
    )
      return true;

    // New transfer from own device
    if (
      ids?.type == "device" &&
      get(devices)?.others.some(
        (device) => type == "request" && device.did === did,
      )
    )
      return true;

    // New transfer from contact
    if (
      ids?.type == "contact" &&
      get(contacts).some(
        (con) =>
          type == "request" &&
          con.uid === ids.id &&
          con.devices.some((dev) => dev.did === did),
      )
    )
      return true;

    // New transfer from group
    if (
      ids?.type == "group" &&
      get(groupDevices).some(
        (device) =>
          type == "request" && device.did === did && device.gid === ids.id,
      )
    )
      return true;

    return false;
  }

  private getTransferOut(id: string) {
    const transfer = this.outgoing.find((f) => f.id == id);
    if (transfer === undefined)
      throw new Error("Filetransfer: Failed to find transfer");

    return transfer;
  }

  private getTransferIn(id: string) {
    const transfer = this.incoming.find((f) => f.id == id);
    if (transfer === undefined)
      throw new Error("Filetransfer: Failed to find transfer");

    return transfer;
  }

  // Handle WebRTC/WebSocket data
  handle(data: Exclude<webRTCData, Update>, did: number) {
    if (data.type == "error") {
      console.warn(`Filetransfer (did: ${did}): ${data.message}`);
    } else if (
      this.authenticated(
        did,
        data.id,
        data.type,
        "previous" in data ? data.previous : undefined,
        data.type == "request" ? data.ids : undefined,
      )
    ) {
      // Sender:
      if (data.type == "ready") {
        this.handleReady(did, data.id);
      } else if (data.type == "accept") {
        if (data.guest == true)
          this.getTransferOut(data.id).sendRequest({
            type: "guest",
            from: did,
          });
        else this.getTransferOut(data.id).sendChunked(did);
      } else if (data.type == "reject") {
        this.getTransferOut(data.id).handleFileTransferFinished(
          did,
          "rejected",
        );
      } else if (data.type == "file-finish") {
        this.getTransferOut(data.id).handleFileFinish(
          did,
          data.file_id,
          data.missing,
        );
      } else if (data.type == "transfer-finish") {
        this.getTransferOut(data.id).handleFileTransferFinished(did, "sent");

        // Receiver:
      } else if (data.type == "request") {
        this.handleRequest(did, data);
      } else if (data.type == "chunk") {
        this.getTransferIn(data.id).handleChunk(
          data.chunk.file_id,
          data.chunk.data,
          data.chunk.id,
          data.final,
        );
      }
    } else {
      peer().sendMessage(did, {
        type: "error",
        message: "401 Unauthorized",
      });
    }
  }

  private handleReady(did: number, nid: string) {
    const unauthorized = () =>
      peer().sendMessage(did, {
        type: "error",
        message: "401 Unauthorized",
      });

    const transfer = this.outgoing.find((transfer) => transfer.nid == nid);

    if (transfer === undefined) unauthorized();
    else {
      if (transfer.ids.type == "contact") {
        const contact = get(contacts).find(
          (c) => transfer.ids.type == "contact" && c.uid === transfer.ids.id,
        );
        if (
          contact === undefined ||
          !contact.devices.some((d) => d.did === did)
        )
          return unauthorized();
      } else if (transfer.ids.type == "group") {
        if (
          !get(groupDevices).some(
            (d) =>
              transfer.ids.type == "group" &&
              d.gid === transfer.ids.id &&
              d.did === did,
          )
        )
          return unauthorized();
      } else if (transfer.ids.type == "devices") {
        if (!get(devices)?.others.some((d) => d.did === did))
          return unauthorized();
      } else return unauthorized();

      transfer.sendRequest({ type: "notification", from: did });
    }
  }

  // Cancel filetransfers
  cancelOutgoing(id?: string) {
    if (id === undefined) {
      const ids: number[] = [];

      for (const transfer of this.outgoing) {
        for (const recipient of transfer.recipients) {
          recipient.state = "canceled";

          if (!ids.some((id) => id === recipient.did)) {
            ids.push(recipient.did);
            peer().clearBuffer(recipient.did);
          }
        }
      }

      this.outgoing = [];
    } else {
      const transfer = this.outgoing.find((t) => t.id == id);

      if (transfer !== undefined) {
        for (const recipient of transfer.recipients) {
          recipient.state = "canceled";
          peer().clearBuffer(recipient.did);
        }

        this.outgoing = this.outgoing.filter((t) => t.id != id);
      }
    }
  }

  cancelIncoming() {
    for (const transfer of this.incoming) {
      transfer.sendAnswer(false);
    }
  }
}

export const manager = new TransferManager();
