import { browser } from "$app/environment";
import { page } from "$app/stores";
import { get, writable } from "svelte/store";
import type { Unsubscribable } from "@trpc/server/observable";

import { trpc } from "$lib/trpc/client";

import { DeviceType, ONLINE_STATUS_REFRESH_TIME } from "./common";
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

export function withDeviceType(name: string): { type: string; name: string } {
  // @ts-ignore
  return { name, type: DeviceType[name] as string };
}

export const setupGuest = async () => {
  const res = await fetch("/api/setup/guest", {
    method: "POST",
  });

  if (!res.ok) throw new Error("Failed to setup guestId.");
};

const heartbeatInterval = writable<NodeJS.Timeout | undefined>();
export function startHeartbeat(guest: boolean) {
  if (get(heartbeatInterval) !== undefined) return;
  heartbeatInterval.set(
    setInterval(() => {
      guest
        ? trpc().guest.sendHeartbeat.mutate()
        : trpc().authorized.sendHeartbeat.mutate();
    }, ONLINE_STATUS_REFRESH_TIME * 1000),
  );
}

export function stopHeartbeat() {
  clearInterval(get(heartbeatInterval));
  heartbeatInterval.set(undefined);
}

const subscriptions = writable<Unsubscribable[]>([]);
export function startSubscriptions(guest: boolean) {
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
      | { type: "webrtc"; data: any /* Raw Uint8Array */ }
      | { type: "signal"; data: string };
    from: number;
  }) => {
    if (data.data.type == "signal")
      peer().signal(data.from, JSON.parse(data.data.data));
    else {
      peer().handle(data.from, new Uint8Array(Object.values(data.data.data)));
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
}
export function stopSubscriptions() {
  get(subscriptions).forEach((sub) => {
    sub.unsubscribe();
  });
  subscriptions.set([]);
}

export async function deleteAccount() {
  if (get(page).url.hostname == "localhost") return;

  const res = await fetch("/api/user", {
    method: "DELETE",
  });

  if (browser && res) {
    localStorage.removeItem("loggedIn");
    window.location.href = "/setup";
  }
}
