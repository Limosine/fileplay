import { writable } from "svelte/store";

export const setup_completed = writable(false);

export const notification_open = writable(false);

export const select_open = writable(false);

export const add_open = writable(false);

export const codehostname = writable("");

export const notifications = writable<{title: string, content: string}[]>([]);