import { browser } from "$app/environment";
import { page } from "$app/stores";
import { get, writable } from "svelte/store";
import type { Unsubscribable } from "@trpc/server/observable";

import { click, files } from "$lib/components/Input.svelte";
import { outgoing_filetransfers } from "$lib/sharing/common";
import { sendRequest } from "$lib/sharing/send";
import { trpc } from "$lib/trpc/client";

import { DeviceType, ONLINE_STATUS_REFRESH_TIME } from "./common";
import { SendState, sendState } from "./sendstate";
import { peer } from "./simple-peer";
import { contacts, devices, own_did, user } from "./UI";

// contacts
export interface IContact {
  cid: number;
  uid: number;
  display_name: string;
  avatar_seed: string;
  linked_at: number;
  devices: IDeviceInfo[];
}

// devices
export interface IDevices {
  self: {
    did: number;
    type: DeviceType;
    display_name: string;
    created_at: number;
    last_seen_at: number;
  };
  others: {
    did: number;
    type: DeviceType;
    display_name: string;
    created_at: number;
    last_seen_at: number;
    is_online: number;
  }[];
}

// device infos
export interface IDeviceInfo {
  did: number;
  type: string;
  display_name: string;
}

// user
export interface IUser {
  uid: number;
  display_name: string;
  avatar_seed: string;
  created_at: number;
}

export const withDeviceType = (name: string) => {
  // @ts-ignore
  return { name, type: DeviceType[name] as string };
};

export const setupGuest = async () => {
  const res = await fetch("/api/setup/guest", {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to setup guestId.");
};

const heartbeatInterval = writable<NodeJS.Timeout | undefined>();
export const startHeartbeat = (guest: boolean) => {
  if (get(heartbeatInterval) !== undefined) return;
  heartbeatInterval.set(
    setInterval(() => {
      guest
        ? trpc().guest.sendHeartbeat.mutate()
        : trpc().authorized.sendHeartbeat.mutate();
    }, ONLINE_STATUS_REFRESH_TIME * 1000),
  );
};

export const stopHeartbeat = () => {
  clearInterval(get(heartbeatInterval));
  heartbeatInterval.set(undefined);
};

const subscriptions = writable<Unsubscribable[]>([]);
export const startSubscriptions = (guest: boolean) => {
  if (get(subscriptions).length !== 0) return;

  const onUser = (data: IUser) => {
    user.set(data);
  };
  const onDevices = (data: IDevices) => {
    devices.set(data);
    own_did.set(data.self.did);
  };
  const onContacts = (data: IContact[]) => {
    contacts.set(data);
  };
  const onWebRTCData = (data: {
    data:
      | {
          type: "webrtc";
          data: any /* Raw Uint8Array (reality: { "0": 0, "1": 0, ... }) */;
        }
      | { type: "signal"; data: string };
    from: number;
  }) => {
    if (data.data.type == "signal")
      peer().signal(data.from, JSON.parse(data.data.data));
    else {
      peer().handle(
        data.from,
        new Uint8Array(Object.values(data.data.data)),
        "websocket",
      );
    }
  };

  const client = trpc();
  subscriptions.update((subs) => {
    if (!guest) {
      subs.push(
        client.authorized.getUser.subscribe(undefined, { onData: onUser }),
      );
      subs.push(
        client.authorized.getDevices.subscribe(undefined, {
          onData: onDevices,
        }),
      );
      subs.push(
        client.authorized.getContacts.subscribe(undefined, {
          onData: onContacts,
        }),
      );
    }
    subs.push(
      guest
        ? client.guest.getWebRTCData.subscribe(undefined, {
          onData: onWebRTCData,
        })
        : client.authorized.getWebRTCData.subscribe(undefined, {
          onData: onWebRTCData,
        }),
    );

    return subs;
  });
};
export const stopSubscriptions = () => {
  get(subscriptions).forEach((sub) => {
    sub.unsubscribe();
  });
  subscriptions.set([]);
};

export const deleteAccount = async () => {
  if (get(page).url.hostname == "localhost") return;

  const res = await fetch("/api/user", {
    method: "DELETE",
  });

  if (browser && res) {
    localStorage.removeItem("loggedIn");
    window.location.href = "/setup";
  }
};

export const handleMessage = (
  event: MessageEvent<{ data: any; action: string }>,
) => {
  if (event.data.action == "load-data") {
    const swFiles: File[] = event.data.data;
    const dataTransfer = new DataTransfer();

    swFiles.forEach((file) => {
      dataTransfer.items.add(file);
      click(dataTransfer.files);
    });

    get(page).url.searchParams.delete("share-target");
  } else if (event.data.action == "chunked-files") {
    const index = get(outgoing_filetransfers).findIndex(
      (transfer) => transfer.id == event.data.data.id,
    );
    const transfer = get(outgoing_filetransfers)[index];

    if (index !== -1) {
      outgoing_filetransfers.update((transfers) => {
        transfers[index].files = event.data.data.files;
        return transfers;
      });

      if (
        transfer.cid !== undefined &&
        get(sendState)[transfer.cid] !== SendState.REQUESTING
      ) {
        sendState.set(transfer.cid, SendState.REQUESTING);
      }

      const previous = get(page).url.searchParams.get("id");

      if (transfer.did !== undefined) {
        sendRequest(
          transfer.did,
          transfer.id,
          previous === null ? undefined : previous,
        );
      }
    }
  }
};
