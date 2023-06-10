import { get, writable } from "svelte/store";
import { publicKey_armored } from "./openpgp";

export interface Contact {
  cid: number;
  displayName: string;
  avatarSeed: string;
  linkedAt: number;
  isOnline: number;
};

export const contacts = writable<
  Promise<{
    cid: number;
    displayName: string;
    avatarSeed: string;
    linkedAt: number;
    isOnline: number;
  }[]>>();

export const contacts_loaded = writable(false);

export async function getContacts(): Promise<{
  cid: number;
  displayName: string;
  avatarSeed: string;
  linkedAt: number;
  isOnline: number;
}[]> {
  const res = await fetch("/api/contacts", {
    method: "GET",
    headers: {
      "accept": "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch contacts");
  
  return await res.json();
}

export const devices = writable<
  Promise<{
    did: number;
    type: string;
    displayName: string;
    createdAt: number;
    lastSeenAt: number;
    }[]>>();
export const devices_loaded = writable(false);

export async function getDevices(): Promise<
  {
    did: number;
    type: string;
    displayName: string;
    createdAt: number;
    lastSeenAt: number;
  }[]
> {
  const res = await fetch("/api/devices", {
    method: "GET",
  });

  const devices_new = await res.json();

  devices.set(devices_new);
  if (!get(devices_loaded)) devices_loaded.set(true);

  return devices_new;
}

export const user = writable<
  Promise<{
    uid: number;
    displayName: string;
    avatarSeed: string;
    createdAt: number;
    lastSeenAt: number;
  }>
>();
export const user_loaded = writable(false);

export async function getUserInfo(): Promise<{
  uid: number;
  displayName: string;
  avatarSeed: string;
  createdAt: number;
  lastSeenAt: number;
}> {
  const res = await fetch("/api/user", {
    method: "GET",
  });

  const user_new = await res.json();

  user.set(user_new);
  if (!get(user_loaded)) user_loaded.set(true);

  return user_new;
}

export async function updatePeerJS_ID() {
  await fetch("/api/devices", {
    method: "POST",
    body: JSON.stringify({
      peerJsId: publicKey_armored,
    }),
  });
}

export function getContent() {
  console.log('getting content')
  getUserInfo();
  getContacts();
  getDevices();
}
