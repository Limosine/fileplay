import { decode, encode } from "@msgpack/msgpack";
import { get, writable } from "svelte/store";

import { peer } from "$lib/lib/simple-peer";
import { contacts, devices, own_did, user } from "$lib/lib/UI";

import type { MessageFromClient, MessageFromServer } from "./common";

const store = writable<APIClient>();

export const apiClient = () => {
  let peerStore = get(store);
  if (peerStore === undefined) {
    peerStore = new APIClient();
    store.set(peerStore);
    return peerStore;
  } else {
    return peerStore;
  }
};

class APIClient {
  socket: WebSocket;
  messageId: number;
  promises: ((value: any) => void)[];

  constructor() {
    this.messageId = 0;
    this.promises = [];
    this.socket = new WebSocket(
      `${location.protocol === "http:" ? "ws:" : "wss:"}//${
        location.host
      }/api/websocket`,
    );

    this.socket.addEventListener("open", () => {
      this.socket.send(encode({}));
    });

    this.socket.addEventListener("message", (event) => {
      this.handleData(decode(event.data) as MessageFromServer);
    });

    this.socket.addEventListener("close", (event) => {
      setTimeout(() => {
        console.log("WebSocket closed, reason: ", event.reason);
        if (event.code !== 1008) store.set(new APIClient());
      }, 5000);
    });
  }

  sendMessage(message: Omit<MessageFromClient, "id">) {
    console.log(message);
    const msg = {
      id: ++this.messageId,
      type: message.type,
      data: message.data,
    };

    this.socket.send(encode(msg));

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
    console.log(message);

    if (message.type == "user") {
      user.set(message.data);
    } else if (message.type == "devices") {
      devices.set(message.data);
      own_did.set(message.data.self.did);
    } else if (message.type == "contacts") {
      contacts.set(message.data);
    } else if (message.type == "webRTCData") {
      if (message.data.data.type == "signal")
        peer().signal(message.data.from, message.data.data.data);
      else {
        peer().handle(message.data.from, message.data.data.data, "websocket");
      }
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
