import { browser } from "$app/environment";
import { page } from "$app/stores";
import type { SignalData } from "simple-peer";
import { get, writable } from "svelte/store";
import type { Unsubscribable } from "@trpc/server/observable";

import { DeviceType, ONLINE_STATUS_REFRESH_TIME } from "./common";
import { trpc } from "$lib/trpc/client";
import { connections, connectToDevice } from "./simple-peer";
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

const heartbeatInterval = writable<NodeJS.Timeout | undefined>();
export function startHeartbeat() {
  if (get(heartbeatInterval) !== undefined) return;
  heartbeatInterval.set(
    setInterval(() => {
      trpc().sendHeartbeat.mutate();
    }, ONLINE_STATUS_REFRESH_TIME * 1000),
  );
}

export function stopHeartbeat() {
  clearInterval(get(heartbeatInterval));
  heartbeatInterval.set(undefined);
}

const subscriptions = writable<Unsubscribable[]>([]);
export function startSubscriptions() {
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
  const onWebRTCData = (data: { from: number; data: string }) => {
    if (get(connections)[data.from] === undefined || get(connections)[data.from].closed || get(connections)[data.from].destroyed)
      connectToDevice(data.from, false).signal(JSON.parse(data.data));
    else get(connections)[data.from].signal(JSON.parse(data.data));
  };

  const client = trpc();
  subscriptions.update((subs) => {
    subs.push(client.getUser.subscribe(undefined, { onData: onUser }));
    subs.push(client.getDevices.subscribe(undefined, { onData: onDevices }));
    subs.push(client.getContacts.subscribe(undefined, { onData: onContacts }));
    subs.push(
      client.getWebRTCData.subscribe(undefined, { onData: onWebRTCData }),
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

export async function getWebRTCOffer(did: number): Promise<string> {
  if (get(page).url.hostname == "localhost") return "";

  const res = await fetch(`/api/guest?did=${did}`, {
    method: "GET",
  });

  return await res.json();
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
