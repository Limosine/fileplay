import { writable, type Writable } from "svelte/store";

export let contacts: Promise<{cid: number, displayName: string, avatarSeed: string, linkedAt: number, isOnline: number}[]>;
export let contacts_loaded = false;

export async function getContacts(): Promise<{cid: number, displayName: string, avatarSeed: string, linkedAt: number, isOnline: number}[]> {
  const res = await fetch('/api/contacts', {
    method: 'GET'
  });

  const contacts_new = await res.json();

  contacts = contacts_new;
  if (!contacts_loaded) contacts_loaded = true;

  return contacts_new;
}