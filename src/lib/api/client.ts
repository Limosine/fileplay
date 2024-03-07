import { browser } from "$app/environment";
import { CapacitorHttp } from "@capacitor/core";
import { decode, encode } from "@msgpack/msgpack";
import { get, readable, writable } from "svelte/store";

import { env } from "$env/dynamic/public";
import { peer } from "$lib/lib/simple-peer";
import {
  addDialog,
  addProperties,
  contacts,
  deviceParams,
  devices,
  user,
  userParams,
} from "$lib/lib/UI";
import { onGuestPage } from "$lib/lib/utils";

import type { MessageFromClient, MessageFromServer } from "./common";

const getHost = (ws = false) => {
  if (env.PUBLIC_HOSTNAME) {
    if (env.PUBLIC_HOSTNAME.split(":")[0] == "localhost" && ws)
      return "localhost:3001";
    else return env.PUBLIC_HOSTNAME;
  } else {
    throw new Error("Please define a public hostname.");
  }
};

const getProtocol = (ws = false) => {
  if (browser && location.protocol == "https:") {
    if (!ws) return location.protocol;
    else return "wss:";
  } else {
    if (!ws) return "http:";
    else return "ws:";
  }
};

class HTTPClient {
  private host: string;

  constructor() {
    this.host = getHost();
  }

  async checkProfanity(username: string) {
    const res = await CapacitorHttp.post({
      url: `${getProtocol()}//${this.host}/api/checkProfanity`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        username,
      },
    });

    return JSON.parse(res.data) as boolean;
  }

  async setupDevice(device: { display_name: string; type: string } | string) {
    if (typeof device == "string") {
      return await CapacitorHttp.post({
        url: `${getProtocol()}//${this.host}/api/devices/link`,
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          code: device,
        },
      });
    } else {
      return await CapacitorHttp.post({
        url: `${getProtocol()}//${this.host}/api/setup/device`,
        headers: {
          "Content-Type": "application/json",
        },
        data: device,
      });
    }
  }

  async setupUser(user: { display_name: string; avatar_seed: string }) {
    return await CapacitorHttp.post({
      url: `${getProtocol()}//${this.host}/api/setup/user`,
      headers: {
        "Content-Type": "application/json",
      },
      data: user,
    });
  }

  async setupGuest() {
    const res = await CapacitorHttp.post({
      url: `${getProtocol()}//${this.host}/api/setup/guest`,
    });

    if (Array.from(res.status.toString())[0] != "2")
      throw new Error("Failed to setup guestId.");
  }

  async deleteDevice() {
    await CapacitorHttp.delete({
      url: `${getProtocol()}//${this.host}/api/devices`,
    });
  }

  async deleteAccount() {
    const res = await CapacitorHttp.delete({
      url: `${getProtocol()}//${this.host}/api/user`,
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
      `${getProtocol(true)}//${getHost(true)}/api/websocket?type=${onGuestPage() ? "guest" : "main"}`,
    );

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
      userParams.set({
        display_name: message.data.display_name,
        avatar_seed: message.data.avatar_seed,
      });

      user.set(message.data);
    } else if (message.type == "devices") {
      deviceParams.update((deviceParams) => {
        deviceParams = [];

        deviceParams[message.data.self.did] = {
          display_name: message.data.self.display_name,
          type: message.data.self.type,
        };

        for (const infos of message.data.others) {
          deviceParams[infos.did] = {
            display_name: infos.display_name,
            type: infos.type,
          };
        }

        return deviceParams;
      });

      devices.set(message.data);
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
      message.type == "contactCodeRedeemed" ||
      message.type == "deviceCodeRedeemed"
    ) {
      if (get(addDialog).open) ui("#dialog-add");
      if (message.type == "contactCodeRedeemed")
        addProperties.update((properties) => {
          properties.redeem = true;
          return properties;
        });
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
