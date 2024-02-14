import { writable } from "svelte/store";

// Main
export const connections = writable<{ a: number; b: number }[]>([]);

// Guest
export const guests = writable<true[]>([]);
export const guestSecret = writable<CryptoKey>(); // changed on every restart
export const filetransfers = writable<{ id: string; did: number }[]>([]);
