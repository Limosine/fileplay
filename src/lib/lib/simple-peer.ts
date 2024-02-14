import { page } from "$app/stores";
import { decode, encode } from "@msgpack/msgpack";
import SimplePeer, { type SignalData } from "simple-peer";
import { get, writable } from "svelte/store";
import type { MaybePromise } from "@sveltejs/kit";

import { concatArrays, type webRTCData } from "$lib/sharing/common";
import { handleData } from "$lib/sharing/main";

import {
  decryptData,
  encryptData,
  publicKeyJwk,
  updateKey,
} from "./encryption";
import { numberToUint8Array, uint8ArrayToNumber } from "./utils";
import { apiClient } from "$lib/websocket/client";

const store = writable<Peer>();

export const peer = () => {
  let peerStore = get(store);
  if (peerStore === undefined) {
    peerStore = new Peer();
    store.set(peerStore);
    return peerStore;
  } else {
    return peerStore;
  }
};

class Peer {
  private connections: {
    data:
      | { data: Promise<SimplePeer.Instance>; timer?: NodeJS.Timeout }
      | "websocket";
    events: EventTarget;
    key?: number; // key index
  }[];

  private keys: {
    data: CryptoKey; // ECDH PublicKey
    counter: number;
    id: 0 | 1; // Own key id
  }[];

  private buffer: { data: Uint8Array[]; state: "idle" | "working" }[];

  private fallback: boolean;

  private turn: MaybePromise<{ username: string; password: string } | any>;

  constructor() {
    this.connections = [];
    this.keys = [];
    this.buffer = [];
    this.fallback = !SimplePeer.WEBRTC_SUPPORT;

    if (this.fallback) this.turn = { username: "", password: "" };
    else {
      this.turn = apiClient().sendMessage({ type: "getTurnCredentials" });
    }
  }

  // WebRTC

  private async establishWebRTC(
    did: number,
    initiator: boolean,
    events: EventTarget,
  ) {
    const awaitCredentials = async () => {
      const peer = new SimplePeer({
        initiator,
        trickle: true,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19305" },
            {
              urls: "turns:turn.wir-sind-frey.de:443",
              username: (await this.turn).username,
              credential: (await this.turn).password,
            },
            {
              urls: "turn:turn.wir-sind-frey.de:5349?transport=tcp",
              username: (await this.turn).username,
              credential: (await this.turn).password,
            },
          ],
        },
      });

      peer.on("signal", (data) => {
        if (window.location.pathname.slice(0, 6) == "/guest")
          apiClient().sendMessage({
            type: "shareFromGuest",
            data: {
              did,
              guestTransfer: String(get(page).url.searchParams.get("id")), // TODO
              data: { type: "signal", data: JSON.stringify(data) },
            },
          });
        else
          apiClient().sendMessage({
            type: "share",
            data: {
              did,
              data: { type: "signal", data: JSON.stringify(data) },
            },
          });
      });

      peer.on("connect", () => {
        this.clearTimer(did);
        if (initiator) this.sendKey(did, undefined, true);
      });

      peer.on("data", async (data) => {
        this.handle(did, data, "webrtc");
      });

      const deletePeer = (err?: Error) => {
        if (!peer.destroyed) peer.destroy();
        if (err !== undefined) console.warn(err);

        if (
          this.connections[did] !== undefined &&
          this.connections[did].data !== "websocket"
        )
          delete this.connections[did];
      };

      peer.on("close", deletePeer);
      peer.on("error", (err) => deletePeer(err));

      return peer;
    };

    console.log("Establishing WebRTC connection");

    const peer = awaitCredentials();

    const timer = setTimeout(() => {
      console.log("Failed to establish WebRTC connection");
      this.establishWebSocket(did, initiator, events);
    }, 5000);

    this.connections[did] = {
      data: { data: peer, timer },
      events,
    };

    return peer;
  }

  private clearTimer(did: number) {
    const peer = this.connections[did];

    if (
      peer !== undefined &&
      peer.data !== "websocket" &&
      peer.data.timer !== undefined
    ) {
      clearTimeout(peer.data.timer);
      this.connections[did].data = {
        data: peer.data.data,
      };
    }
  }

  private async establishWebSocket(
    did: number,
    initiator: boolean,
    events: EventTarget,
  ) {
    console.log("Establishing WebSocket connection");

    // Clear previous connection
    const peer = this.connections[did];
    this.clearTimer(did);

    // Setup connection
    this.connections[did] = {
      data: "websocket",
      events: peer !== undefined ? peer.events : events,
    };
    if (initiator) this.sendKey(did, undefined, true);

    // Send buffered data
    if (this.buffer[did] !== undefined) {
      this.sendOverTrpc(did, this.buffer[did].data);
      this.buffer[did] = {
        data: [],
        state: "idle",
      };
    }
  }

  private connect(
    did: number,
    initiator: boolean,
    events = new EventTarget(),
    forceWebSocket?: boolean,
  ) {
    if (this.fallback === true || forceWebSocket)
      this.establishWebSocket(did, initiator, events);
    else return this.establishWebRTC(did, initiator, events);
  }

  async closeConnections() {
    for (const conn of this.connections) {
      if (conn.data !== undefined && conn.data !== "websocket") {
        if (conn.data.timer !== undefined) clearTimeout(conn.data.timer);
        (await conn.data.data).destroy();
      }
    }
    this.buffer = [];
    this.connections = [];
  }

  private async sendMessages(did: number) {
    if (this.buffer[did] === undefined) return;
    if (this.buffer[did].data.length <= 0) {
      this.buffer[did].state = "idle";
      return;
    }

    const peer = this.connections[did];

    if (peer === undefined) {
      this.connect(did, true);
    } else if (peer.data !== undefined && peer.data !== "websocket") {
      this.buffer[did].state = "working";
      const conn = await peer.data.data;

      const chunk = this.buffer[did].data[0];
      this.buffer[did].data.splice(0, 1);

      const promise = new Promise<null>((resolve) => {
        conn.write(chunk, undefined, () => {
          resolve(null);
          this.sendMessages(did);
        });
      });

      return await promise;
    }
  }

  private sendOverTrpc = (did: number, dataArray: Uint8Array[]) => {
    if (window.location.pathname.slice(0, 6) == "/guest") {
      dataArray.forEach((data) => {
        apiClient().sendMessage({
          type: "share",
          data: {
            did,
            guestTransfer: String(get(page).url.searchParams.get("id")), // TODO
            data: { type: "webrtc", data: data },
          },
        });
      });
    } else {
      dataArray.forEach((data) => {
        apiClient().sendMessage({
          type: "share",
          data: {
            did,
            data: { type: "webrtc", data: data },
          },
        });
      });
    }
  };

  async sendMessage(
    did: number,
    data: webRTCData | { type: "connect" },
    encrypt = true,
    immediately = false,
  ) {
    const addToBuffer = async (chunk: Uint8Array) => {
      if (this.buffer[did] === undefined)
        this.buffer[did] = { data: [], state: "idle" };
      if (immediately) {
        this.buffer[did].data.unshift(chunk);
      } else {
        this.buffer[did].data.push(chunk);
      }

      if (
        this.buffer[did].state == "idle" &&
        this.connections[did] !== undefined &&
        this.connections[did].data !== "websocket"
      )
        await this.sendMessages(did);
    };

    const peer = this.connections[did];

    if (peer === undefined || (encrypt && peer.key === undefined)) {
      const events = peer === undefined ? new EventTarget() : peer.events;

      if (encrypt) {
        const send = async () => {
          const peer = this.connections[did];
          peer.events.removeEventListener("encrypted", send);

          const chunk = concatArrays([
            numberToUint8Array(1, 1),
            await encryptData(encode(data), did),
          ]);

          if (
            this.fallback ||
            (peer !== undefined && peer.data == "websocket")
          ) {
            this.sendOverTrpc(did, [chunk]);
          } else {
            await addToBuffer(chunk);
          }
        };

        events.addEventListener("encrypted", send);
        if (peer === undefined) this.connect(did, true, events);
      } else {
        const chunk = concatArrays([numberToUint8Array(0, 1), encode(data)]);
        if (this.fallback || (peer !== undefined && peer.data == "websocket")) {
          if (peer === undefined) this.connect(did, true, events);
          this.sendOverTrpc(did, [chunk]);
        } else {
          await addToBuffer(chunk);
          if (peer === undefined) this.connect(did, true, events);
        }
      }
    } else {
      let chunk: Uint8Array;
      if (encrypt) {
        chunk = concatArrays([
          numberToUint8Array(1, 1),
          await encryptData(encode(data), did),
        ]);
      } else {
        chunk = concatArrays([numberToUint8Array(0, 1), encode(data)]);
      }

      if (this.fallback || (peer !== undefined && peer.data == "websocket")) {
        this.sendOverTrpc(did, [chunk]);
      } else {
        await addToBuffer(chunk);
      }
    }
  }

  async signal(did: number, data: SignalData) {
    const peer = this.connections[did];

    const connect = async (events?: EventTarget) =>
      (await this.connect(did, false, events))?.signal(data);

    if (peer !== undefined) {
      if (peer.data == "websocket") {
        // TODO
        delete this.connections[did];
        connect(peer.events);
      } else (await peer.data.data).signal(data);
    } else connect();
  }

  clearBuffer(did?: number) {
    if (did === undefined) this.buffer = [];
    else delete this.buffer[did];
  }

  private sendKey(did: number, id: 0 | 1 = 0, initiator?: true) {
    this.sendMessage(
      did,
      {
        type: "update",
        key: publicKeyJwk,
        id,
        initiator,
      },
      false,
      true,
    );
  }

  // Encryption

  async handle(did: number, data: Uint8Array, origin: "webrtc" | "websocket") {
    const handleDecoded = async (data: webRTCData) => {
      console.log(data);

      if (data.type == "update") {
        const conn = this.connections[did];

        if (conn !== undefined && conn.data != "websocket")
          this.clearTimer(did);

        if (
          conn === undefined ||
          (conn.data != "websocket" && origin == "websocket")
        )
          await this.connect(
            did,
            false,
            undefined,
            origin === "websocket" ? true : undefined,
          );

        const id = await updateKey(did, data.key, data.id === 0 ? 1 : 0);
        if (data.initiator) {
          this.sendKey(did, id);
        }
      } else {
        handleData(data, did);
      }
    };

    if (uint8ArrayToNumber(data.slice(0, 1)) === 1) {
      const conn = this.connections[did];
      if (conn === undefined) return;

      if (conn.key !== undefined) {
        handleDecoded(
          decode(await decryptData(data.slice(1), did)) as webRTCData,
        );
      } else {
        const decrypt = async () => {
          handleDecoded(
            decode(await decryptData(data.slice(1), did)) as webRTCData,
          );
          conn.events.removeEventListener("encrypted", decrypt);
        };

        conn.events.addEventListener("encrypted", decrypt);
      }
    } else {
      handleDecoded(decode(data.slice(1)) as webRTCData);
    }
  }

  getKey(did: number) {
    const peer = this.connections[did];

    if (peer !== undefined && peer.key !== undefined) {
      const key = this.keys[peer.key];
      return { data: key.data, id: key.id };
    } else {
      throw new Error("Encryption: No encrypted connection to this device");
    }
  }

  setKey(did: number, key: CryptoKey, id: 0 | 1) {
    const peer = this.connections[did];

    if (peer !== undefined) {
      let index = this.keys.findIndex((k) => k.data == key);

      if (index === -1) {
        index = this.keys.push({ data: key, counter: 0, id }) - 1;
      }

      this.connections[did].key = index;

      peer.events.dispatchEvent(new Event("encrypted"));
      return this.keys[index].id;
    } else {
      throw new Error("Encryption: No connection to this device");
    }
  }

  increaseCounter(did: number) {
    const peer = this.connections[did];

    if (peer !== undefined && peer.key !== undefined) {
      return ++this.keys[peer.key].counter;
    } else {
      throw new Error("Encryption: No encrypted connection to this device");
    }
  }

  getId(did: number) {
    const peer = this.connections[did];

    if (peer !== undefined && peer.key !== undefined) {
      return this.keys[peer.key].id;
    } else {
      throw new Error("Encryption: No encrypted connection to this device");
    }
  }
}
