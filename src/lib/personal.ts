import { writable, type Writable } from "svelte/store";

export const contacts = writable<Promise<{cid: number, displayName: string, avatarSeed: string, linkedAt: number, isOnline: number}[]>>();

export async function getContacts(): Promise<{cid: number, displayName: string, avatarSeed: string, linkedAt: number, isOnline: number}[]> {
  const res = await fetch('/api/contacts', {
    method: 'GET'
  });

  const contacts_new = await res.json();

  contacts.set(contacts_new);

  return contacts_new;
}

export function getContent() {
  getContacts();
}