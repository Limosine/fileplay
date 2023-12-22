import { browser } from "$app/environment";
import { PUBLIC_FILEPLAY_DOMAIN } from "$env/static/public";
import { get, writable } from "svelte/store";
import { getCombined } from "./fetchers";
import { contacts, deviceInfos, deviceInfos_loaded, devices, devices_loaded, own_did, startRefresh, user, user_loaded } from "./UI";

const createWebSocketListeners = (ws: WebSocket) => {
  ws.onopen = () => {
    status.set("1");

    getCombined(["user", "devices", "deviceInfos", "contacts"]);
    startRefresh();
  };
  ws.onclose = () => {
    status.set("0");
    failureCounter.update((counter) => (counter = counter + 1));
    if (get(failureCounter) < 3) {
      console.log("WebSocket connection closed, retrying in 5 seconds.");
      setTimeout(() => {
        createWebSocket();
      }, 5000);
    } else {
      clearInterval(get(interval));
      console.log("WebSocket connection closed.");
    }
  };
  ws.onmessage = (event) => {
    const response: {
      method: string,
      type: string,
      successful: boolean,
      data?: any
    } = event.data;

    if (response.method == "get") {
      if (response.type == "pong") {
        if (response.successful) status.set("1");
        else status.set("2");

      } else if (response.type == "user") {
        user.set(response.data);
        if (!get(user_loaded)) user_loaded.set(true);

      } else if (response.type == "devices") {
        devices.set(response.data);
        own_did.set(response.data.self.did);
        if (!get(devices_loaded)) devices_loaded.set(true);

      } else if (response.type == "deviceInfos") {
        deviceInfos.set(response.data);
        if (!get(deviceInfos_loaded)) deviceInfos_loaded.set(true);

      } else if (response.type == "contacts") contacts.set(response.data);
    }
  };
  ws.onerror = () => {
    status.set("2");
    createWebSocket();
  };
  return ws;
};

export const createWebSocket = () => {
  const ws = new WebSocket(`wss://${PUBLIC_FILEPLAY_DOMAIN}/websocket`);
  websocket.set(createWebSocketListeners(ws));
};

const failureCounter = writable(0);
const interval = writable<NodeJS.Timeout>();

export const websocket = writable<WebSocket>();
export const status = writable<"0" | "1" | "2">("0");
