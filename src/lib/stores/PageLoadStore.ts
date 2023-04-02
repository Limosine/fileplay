import { writable } from "svelte/store";

const createWritableStore = (key: any, startValue: any) => {
    const { subscribe, set } = writable(startValue);

    return {
        subscribe,
        set: (value: any)=> {
            set(value);
            localStorage.setItem(key, JSON.stringify(value));
        },
        useLocalStorage: () => {
            if(!localStorage) return;
            const json = localStorage.getItem(key);
            if (json) {
                set(JSON.parse(json)); 
                subscribe(current => {
                    localStorage.setItem(key, JSON.stringify(current));
                });
            } else {
                subscribe(() => {
                    localStorage.setItem(key, JSON.stringify(startValue));
                });
            }
        }
    }
}

export const pageLoadCount = createWritableStore("pageloadcount", 0)