import { browser } from "$app/environment";
import { decode, encode } from "@msgpack/msgpack";
import { get, readable, writable } from "svelte/store";

import { peer } from "$lib/lib/simple-peer";
import { contacts, devices, own_did, user } from "$lib/lib/UI";
import { onGuestPage } from "$lib/lib/utils";

import type { MessageFromClient, MessageFromServer } from "./common";

const getHost = async (url = false) => {
  if (!url) {
    if (browser && location.hostname == "localhost") {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) throw new Error();
    }

    return "";
  }

  return "https://fileplay.wir-sind-frey.de";
};

class HTTPClient {
  private host: Promise<string>;

  constructor() {
    this.host = getHost();
  }

  async checkProfanity(username: string) {
    const res = await fetch(`${await this.host}/api/checkProfanity`, {
      method: "POST",
      body: JSON.stringify({
        username,
      }),
    });

    return (await res.json()) as boolean;
  }

  async setupDevice(device: { display_name: string; type: string } | string) {
    if (typeof device == "string") {
      return await fetch(`${await this.host}/api/devices/link`, {
        method: "POST",
        body: JSON.stringify({ code: device }),
      });
    } else {
      return await fetch(`${await this.host}/api/setup/device`, {
        method: "POST",
        body: JSON.stringify(device),
      });
    }
  }

  async setupUser(user: { display_name: string; avatar_seed: string }) {
    return await fetch(`${await this.host}/api/setup/user`, {
      method: "POST",
      body: JSON.stringify(user),
    });
  }

  async setupGuest() {
    const res = await fetch(`${await this.host}/api/setup/guest`, {
      method: "POST",
    });

    if (!res.ok) throw new Error("Failed to setup guestId.");
  }

  async deleteDevice() {
    await fetch(`${await this.host}/api/devices`, {
      method: "DELETE",
    });
  }

  async deleteAccount() {
    const res = await fetch(`${await this.host}/api/user`, {
      method: "DELETE",
    });

    if (browser && res) {
      localStorage.removeItem("loggedIn");
      window.location.href = "/setup";
    }
  }
}

class WebSocketClient {
  private socket: WebSocket;
  private messageId: number;
  private promises: ((value: any) => void)[];
  private buffer: Uint8Array[];

  constructor() {
    this.messageId = 0;
    this.promises = [];
    this.buffer = [];

    this.socket = this.connect();
  }

  private connect() {
    this.socket = new WebSocket(
      `wss://fileplay.wir-sind-frey.de/api/websocket?type=${onGuestPage() ? "guest" : "main"}`,
    );

    console.log(this.socket);

    this.socket.binaryType = "arraybuffer";

    this.socket.addEventListener("open", () => {
      if (!onGuestPage()) {
        this.sendMessage({ type: "deleteTransfer" });
        this.sendMessage({ type: "getInfos" });
      }
      this.sendBuffered();
    });

    this.socket.addEventListener("message", (event) => {
      let data: MessageFromServer;
      if (event.data instanceof ArrayBuffer) {
        data = decode(new Uint8Array(event.data)) as any;
      } else if (typeof event.data == "string") {
        data = JSON.parse(event.data);
      } else {
        console.log(event.data);
        throw new Error("WebSocket: Unknown type.");
      }

      this.handleData(data);
    });

    this.socket.addEventListener("close", (event) => {
      setTimeout(() => {
        console.log("WebSocket closed, reason: ", event.reason);
        peer().closeConnections("websocket");
        if (event.code !== 1008) this.connect();
      }, 5000);
    });

    return this.socket;
  }

  private sendBuffered() {
    if (this.socket.readyState !== 1) return;

    while (this.buffer.length > 0) {
      this.socket.send(this.buffer[0]);
      this.buffer.splice(0, 1);
    }
  }

  sendMessage(message: MessageFromClient) {
    const msg = {
      id: ++this.messageId,
      type: message.type,
      data: "data" in message ? message.data : undefined,
    };

    if (this.socket.readyState === 1) {
      this.socket.send(encode(msg));
    } else {
      this.buffer.push(encode(msg));
    }

    if (
      msg.type == "createTransfer" ||
      msg.type == "createContactCode" ||
      msg.type == "createDeviceCode" ||
      msg.type == "getTurnCredentials"
    ) {
      return new Promise<any>((resolve) => {
        this.promises[msg.id] = resolve;
      });
    }
  }

  private handleData(message: MessageFromServer) {
    if (message.type == "user") {
      user.set(message.data);
    } else if (message.type == "devices") {
      devices.set(message.data);
      own_did.set(message.data.self.did);
    } else if (message.type == "contacts") {
      contacts.set(message.data);
      peer().closeConnections(message.data.map((c) => c.devices));
    } else if (message.type == "webRTCData") {
      if (message.data.data.type == "signal")
        peer().signal(message.data.from, JSON.parse(message.data.data.data));
      else {
        peer().handle(message.data.from, message.data.data.data, "websocket");
      }
    } else if (message.type == "closeConnection") {
      peer().closeConnections(message.data);
    } else if (
      message.type == "filetransfer" ||
      message.type == "contactLinkingCode" ||
      message.type == "deviceLinkingCode" ||
      message.type == "turnCredentials"
    ) {
      const resolve = this.promises[message.id];
      if (resolve !== undefined) resolve(message.data);
    } else if (message.type == "error") {
      console.warn("Error from Server:", message.data);
    } else {
      console.log("Error: Type not found");
    }
  }
}

export function apiClient(method: "http"): HTTPClient;
export function apiClient(method: "ws"): WebSocketClient;
export function apiClient(method: "http" | "ws") {
  if (method == "http") {
    return get(httpStore);
  } else {
    let store = get(wsStore);
    if (store === undefined) {
      store = new WebSocketClient();
      wsStore.set(store);
      return store;
    } else {
      return store;
    }
  }
}

const httpStore = readable(new HTTPClient());
const wsStore = writable<WebSocketClient>();
