import type { EventEmitter } from "events";
import { writable } from "svelte/store";

// Main
export const connections = writable<EventEmitter[]>([]);
export const timers = writable<NodeJS.Timeout[]>([]);
export const files = writable<
  { id: string; did: number; uid: number; password: string; data: Uint8Array }[]
>([]);

// Guest
export const guestSecret = writable<CryptoKey>(); // changed on every restart
export const guests = writable<EventEmitter[]>([]);
export const filetransfers = writable<{ id: string; did: number }[]>([]);
