import { writable } from "svelte/store";

export const notification_open = writable(false);

export const select_open = writable(false);

export const add_open = writable(false);

export const codehostname = writable("");

export const notifications = writable<{title: string, content: string}[]>([
    {title: "Downloaded", content: "File 123456 was downloaded on 01.02.2023"},
    {title: "Contact request", content: "'Hello1234' wants to add you as a contact"},
  ]);