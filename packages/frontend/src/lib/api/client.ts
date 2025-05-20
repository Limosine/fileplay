import { browser } from "$app/environment";
import { pack, unpack } from "msgpackr";
import { derived, get, readable, writable } from "svelte/store";

import { error } from "$lib/lib/error";
import { peer } from "$lib/lib/p2p";
import { ui_object } from "$lib/lib/UI.svelte";
import { onGuestPage, timeoutPromise } from "$lib/lib/utils";

import {
  type MessageFromClient,
  type MessageFromServer,
  type ResponseMap,
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
  readonly connected = derived(error.error, (error) => error === false);

  private socket: WebSocket;
  private reconnectSeconds: number;
  private messageId: number;
  private promises: {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }[];
  private buffer: Uint8Array[];

  constructor() {
    this.reconnectSeconds = 0;
    this.messageId = 0;
    this.promises = [];
    this.buffer = [];

    this.socket = this.connect();

    this.connected.subscribe((value) => {
      if (!value) {
        get(peer).closeConnections("websocket");

        for (let i = 0; i < this.promises.length; ++i) {
          if (typeof this.promises[i] !== "undefined") {
            this.promises[i].reject();
            delete this.promises[i];
          }
        }
      }
    });
  }

  private onOpen = () => {
    if (!onGuestPage()) {
      this.sendMessage({ type: "deleteTransfer" });
      this.sendMessage({ type: "getInfos" });
    }
    this.sendBuffered();
  };

  private connect() {
    this.socket = new WebSocket(
      `${browser && location.protocol == "https:" ? "wss:" : "ws:"}//${location.host}/api/websocket?type=${onGuestPage() ? "guest" : "main"}`,
    );

    this.socket.binaryType = "arraybuffer";

    this.socket.addEventListener("message", (event) => {
      let data;

      if (this.reconnectSeconds != 0) this.reconnectSeconds = 0;

      if (event.data instanceof ArrayBuffer) {
        data = unpack(new Uint8Array(event.data));
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

      error
        .disconnected(this.reconnectSeconds > 10 ? 10 : this.reconnectSeconds++)
        .then(undefined, () => this.connect());
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
      msg.type == "checkConnection" ||
      msg.type == "createTransfer" ||
      msg.type == "createContactCode" ||
      msg.type == "createDeviceCode" ||
      msg.type == "getTurnCredentials"
    ) {
      const promise = new Promise<Awaited<ResponseMap<T>>>((r, j) => {
        this.promises[msg.id] = {
          resolve: r,
          reject: j,
        };
      });

      promise.then(
        () => delete this.promises[msg.id],
        () => delete this.promises[msg.id],
      );

      return promise as any;
    }

    return undefined as ResponseMap<T>;
  }

  checkConnection() {
    const result = Promise.race([
      timeoutPromise(3000),
      this.sendMessage({ type: "checkConnection" }),
    ]);

    return result.then(
      (value) => value === true,
      () => false,
    );
  }

  private handleData(message: MessageFromServer & { id: number }) {
    if (message.type == "status") {
      if (message.data == "authorized" && !get(this.connected)) {
        error.error.set(false);
        this.onOpen();
      } else if (message.data == "unauthorized") {
        error.unauthorized();
      }
    } else if (message.type == "user") {
      ui_object.userParams = {
        display_name: message.data.display_name,
        avatar_seed: message.data.avatar_seed,
      };

      if (!ui_object.user !== undefined) ui_object.initialized("user");
      ui_object.user = message.data;
    } else if (message.type == "devices") {
      const deviceParams = [];

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

      ui_object.deviceParams = deviceParams;

      if (!ui_object.devices !== undefined) ui_object.initialized("devices");
      ui_object.devices = message.data;
    } else if (message.type == "contacts") {
      ui_object.contacts = message.data;
      if (!ui_object.init_props.contacts) ui_object.initialized("contacts");
      get(peer).closeConnections(message.data.map((c) => c.devices));
    } else if (message.type == "groups") {
      if (!ui_object.init_props.groups) ui_object.initialized("groups");
      ui_object.groups = message.data;
    } else if (message.type == "group_devices") {
      if (!ui_object.init_props.groupDevices)
        ui_object.initialized("groupDevices");
      ui_object.groupDevices = message.data;
    } else if (message.type == "webRTCData") {
      if (message.data.data.type == "signal")
        get(peer).signal(message.data.from, JSON.parse(message.data.data.data));
      else {
        get(peer).handle(message.data.from, message.data.data.data);
      }
    } else if (message.type == "closeConnection") {
      get(peer).closeConnections(message.data);
    } else if (
      message.type == "contactCodeRedeemed" ||
      message.type == "deviceCodeRedeemed"
    ) {
      if (ui_object.dialogProperties.mode == "add") ui_object.closeDialog(true);
    } else if (
      message.type == "connected" ||
      message.type == "filetransfer" ||
      message.type == "contactLinkingCode" ||
      message.type == "deviceLinkingCode" ||
      message.type == "turnCredentials"
    ) {
      const promise = this.promises[message.id];
      if (promise !== undefined) promise.resolve(message.data);

      delete this.promises[message.id];
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
