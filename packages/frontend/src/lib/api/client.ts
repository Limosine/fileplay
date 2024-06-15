import { browser } from "$app/environment";
import { pack, unpack } from "msgpackr";
import { get, readable, writable } from "svelte/store";
import type { MaybePromise } from "@sveltejs/kit";

import { peer } from "$lib/lib/p2p";
import {
  closeDialog,
  contacts,
  deviceParams,
  devices,
  dialogProperties,
  groupDevices,
  groups,
  offline,
  user,
  userParams,
} from "$lib/lib/UI";
import { onGuestPage } from "$lib/lib/utils";

import type {
  MessageFromClient,
  MessageFromServer,
  ResponseMap,
} from "../../../../common/api/common";

class HTTPClient {
  async checkProfanity(username: string) {
    const res = await fetch("/api/checkProfanity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
      }),
    });

    return (await res.json()) as boolean;
  }

  async setupDevice(device: { display_name: string; type: string } | string) {
    if (typeof device == "string") {
      return await fetch("/api/devices/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: device,
        }),
      });
    } else {
      return await fetch("/api/setup/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(device),
      });
    }
  }

  async setupUser(user: { display_name: string; avatar_seed: string }) {
    return await fetch("/api/setup/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  }

  async setupGuest() {
    const res = await fetch("/api/setup/guest", {
      method: "POST",
    });

    if (Array.from(res.status.toString())[0] != "2")
      throw new Error("Failed to setup guestId.");
  }

  async deleteAccount(onlyOwn: boolean, forward = true) {
    const res = await fetch(onlyOwn ? "/api/devices" : "/api/user", {
      method: "DELETE",
    });

    if (browser && res && forward) {
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
      `${browser && location.protocol == "https:" ? "wss:" : "ws:"}//${location.host}/api/websocket?type=${onGuestPage() ? "guest" : "main"}`,
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
        data = unpack(new Uint8Array(event.data)) as any;
      } else if (typeof event.data == "string") {
        data = JSON.parse(event.data);
      } else {
        console.log(event.data);
        throw new Error("WebSocket: Unknown type.");
      }

      this.handleData(data);
    });

    this.socket.addEventListener("close", (event) => {
      console.log(
        "WebSocket closed" + (event.reason ? ", reason: " + event.reason : "."),
      );

      peer().closeConnections("websocket");

      if (event.code !== 1008) {
        if (get(offline) === true) {
          const unsubscribe = offline.subscribe(async (offline) => {
            if (!offline) {
              unsubscribe();
              this.connect();
            }
          });
        } else setTimeout(() => this.connect(), 5000);
      } else location.href = "/setup";
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

  sendMessage<T extends MessageFromClient>(message: T): ResponseMap<T> {
    const msg = Object.assign(message, { id: ++this.messageId });

    if (this.socket.readyState === 1) {
      this.socket.send(pack(msg));
    } else {
      this.buffer.push(pack(msg));
    }

    if (
      msg.type == "createTransfer" ||
      msg.type == "createContactCode" ||
      msg.type == "createDeviceCode" ||
      msg.type == "getTurnCredentials"
    ) {
      return new Promise<Awaited<ResponseMap<T>>>((resolve) => {
        this.promises[msg.id] = resolve;
      }) as any;
    }

    return undefined as ResponseMap<T>;
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
    } else if (message.type == "groups") {
      groups.set(message.data);
    } else if (message.type == "group_devices") {
      groupDevices.set(message.data);
    } else if (message.type == "webRTCData") {
      if (message.data.data.type == "signal")
        peer().signal(message.data.from, JSON.parse(message.data.data.data));
      else {
        peer().handle(message.data.from, message.data.data.data);
      }
    } else if (message.type == "closeConnection") {
      peer().closeConnections(message.data);
    } else if (
      message.type == "contactCodeRedeemed" ||
      message.type == "deviceCodeRedeemed"
    ) {
      if (get(dialogProperties).mode == "add") closeDialog(true);
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
