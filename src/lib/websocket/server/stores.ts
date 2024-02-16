import { readable, writable } from "svelte/store";

import { generateKey } from "$lib/server/signing";

// Secret (changed on every restart)
export const guestSecret = readable<CryptoKey>(await generateKey());

export const guests = writable<true[]>([]);
export const filetransfers = writable<{ id: string; did: number }[]>([]);
