import { readable, writable } from "svelte/store";

function createWebSocket() {
  let websocket = new WebSocket("wss://dev.fileplay.pages.dev/websocket");
  websocket.onopen = (event) => {
    websocket.send("isOnline");
  };
  websocket.onclose = (event) => {
    status.set("0");
    console.log("WebSocket connection closed, retrying in 5 seconds.");
    setTimeout(() => {websocket = createWebSocket()}, 5000);
  };
  return websocket;
};

export const socketStore = readable<"0" | "1" | "2">("0", set => {
  const store = createWebSocket();
  store.onmessage = (event) => {
    if (event.data == "1" || event.data == "2") {
      status.set(event.data);
      set(event.data);
    } else {
      console.log(event.data);
    }
  };

  setInterval(() => {
    store.send("ping");
  }, 25000)

  return () => store.close();
});

export const status = writable<"0" | "1" | "2">("0");
