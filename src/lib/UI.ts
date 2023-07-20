import { writable } from "svelte/store";

export const current = writable<"Home" | "Contacts" | "Settings">("Home");