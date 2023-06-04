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

export function getContent() {
  getContacts();
}