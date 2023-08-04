import { readable, writable } from "svelte/store";
import { PUBLIC_FILEPLAY_DOMAIN } from "$env/static/public";

function createWebSocket() {
  let websocket = new WebSocket(`wss://${PUBLIC_FILEPLAY_DOMAIN}/websocket`);
  websocket.onopen = () => {
    websocket.send("isOnline");
  };
  websocket.onclose = () => {
    status.set("0");
    console.log("WebSocket connection closed, retrying in 5 seconds.");
    setTimeout(() => { websocket = createWebSocket(); }, 5000);
  };
  return websocket;
}

export const socketStore = readable<"0" | "1" | "2">("0", set => {
  let store = createWebSocket();
  store.onmessage = (event) => {
    if (event.data == "1" || event.data == "2") {
      status.set(event.data);
      set(event.data);
    } else {
      console.log(event.data);
    }
  };

  setInterval(() => {
    if (store.readyState == 3 || store.readyState == 2) {
      store = createWebSocket();
      store.onmessage = (event) => {
        if (event.data == "1" || event.data == "2") {
          status.set(event.data);
          set(event.data);
        } else {
          console.log(event.data);
        }
      };
    } else {
      store.send("ping");
    }
  }, 25000);

  return () => store.close();
});

export const status = writable<"0" | "1" | "2">("0");
