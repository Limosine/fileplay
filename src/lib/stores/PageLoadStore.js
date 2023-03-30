import { writable } from "svelte/store";

let pageLoadCount = writable(0);

export default pageLoadCount;