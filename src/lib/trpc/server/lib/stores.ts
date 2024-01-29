import { EventEmitter } from "events";
import { writable } from "svelte/store";

// Main
export const connections = writable<EventEmitter[]>([]);
export const timers = writable<NodeJS.Timeout[]>([]);

// Guest
export const guestSecret = writable<CryptoKey>(); // changed on every restart
export const guests = writable<EventEmitter[]>([]);
export const filetransfers = writable<{ id: string; did: number }[]>([]);
