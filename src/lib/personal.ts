import { get, writable } from "svelte/store";

export const contacts = writable<Promise<{cid: number, displayName: string, avatarSeed: string, linkedAt: number, isOnline: number}[]>>();
export const contacts_loaded = writable(false);

export async function getContacts(): Promise<{cid: number, displayName: string, avatarSeed: string, linkedAt: number, isOnline: number}[]> {
  const res = await fetch('/api/contacts', {
    method: 'GET'
  });

  const contacts_new = await res.json();

  contacts.set(contacts_new);
  if (!get(contacts_loaded)) contacts_loaded.set(true);

  return contacts_new;
}

export const devices = writable<Promise<{did: number, type: string, displayName: string, isOnline: number, createdAt: number, lastSeenAt: number, linkedAt: number}[]>>();
export const devices_loaded = writable(false);

export async function getDevices(): Promise<{did: number, type: string, displayName: string, isOnline: number, createdAt: number, lastSeenAt: number, linkedAt: number}[]> {
  const res = await fetch('/api/devices', {
    method: 'GET'
  });

  const devices_new = await res.json();

  devices.set(devices_new);
  if (!get(devices_loaded)) devices_loaded.set(true);

  return devices_new;
}

export function getContent() {
  getContacts();
  getDevices();
}