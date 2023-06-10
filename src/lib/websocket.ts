import { readable } from "svelte/store";

function createWebSocket() {
  let websocket = new WebSocket("wss://dev.fileplay.pages.dev/websocket");
  websocket.onopen = (event) => {
    websocket.send("isOnline");
  };
  websocket.onclose = (event) => {
    console.log("WebSocket connection closed.");
    websocket = createWebSocket();
  };
  return websocket;
};

export const socketStore = readable({}, set => {
  const store = createWebSocket();
  store.onmessage = (event) => {
    console.log(event.data);
    set(event.data);
  };

  return () => store.close();
});