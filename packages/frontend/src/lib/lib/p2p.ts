import { page } from "$app/stores";
import { pack, unpack } from "msgpackr";
import SimplePeer, { type SignalData } from "simple-peer";
import type { MaybePromise } from "@sveltejs/kit";
import { get, writable } from "svelte/store";

import { apiClient } from "$lib/api/client";
import { concatUint8Arrays, type webRTCData } from "$lib/sharing/common";
import { manager } from "$lib/sharing/manager.svelte";

import {
  decryptData,
  encryptData,
  importKey,
  publicKeyJwk,
} from "./encryption";
import type { IDeviceInfo } from "./fetchers";
import { numberToUint8Array, onGuestPage, uint8ArrayToNumber } from "./utils";

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

const createEmptyPromise = () => {
  let res = () => {};
  const promise = new Promise<void>((resolve) => (res = resolve));
  return { promise, resolve: res };
};

abstract class Transport {
  readonly upper: Peer;

  readonly did: number;
  readonly initiator: boolean;

  readonly events: EventTarget;
  readonly buffer: { data: Uint8Array[]; state: "idle" | "working" };
  key:
    | {
        data: CryptoKey; // ECDH PublicKey
        counter: number;
        id: 0 | 1; // Own key id
      }
    | undefined;

  constructor(
    peer: Peer,
    did: number,
    initiator: boolean,
    events = new EventTarget(),
    buffer = new Array<Uint8Array>(),
  ) {
    this.upper = peer;

    this.did = did;
    this.initiator = initiator;

    this.events = events;
    this.buffer = { data: buffer, state: "idle" };

    this.addListeners();
  }

  private addListeners() {
    const onConnect = () => {
      console.log("Peer: Connected");
      if (this.initiator && this.key === undefined)
        this.sendKey(undefined, true);
      else if (this.buffer.state == "idle") this.sendMessages();
    };
    const onDestroy = () => {
      console.log("Peer: Destroyed");
      this.events.removeEventListener("connected", onConnect);
    };

    this.events.addEventListener("connected", onConnect);
    this.events.addEventListener("destroyed", onDestroy, { once: true });
  }

  abstract close(): MaybePromise<void>;

  async sendMessages() {
    const chunk = this.buffer.data.shift();

    if (chunk === undefined) {
      this.buffer.state = "idle";
    } else {
      if (this.buffer.state == "idle") this.buffer.state = "working";

      await this.sendChunk(chunk);
      this.sendMessages();
    }
  }

  abstract sendChunk(chunk: Uint8Array): MaybePromise<void>;

  async addToBuffer(chunk: Uint8Array, immediately: boolean) {
    if (immediately) {
      this.buffer.data.unshift(chunk);
    } else {
      this.buffer.data.push(chunk);
    }

    if (this.buffer.state == "idle") await this.sendMessages();
  }

  async sendMessage(data: webRTCData, encrypt = true, immediately = false) {
    if (encrypt && this.key === undefined) {
      const send = async () => {
        const chunk = concatUint8Arrays([
          numberToUint8Array(1, 1),
          await encryptData(pack(data), this.did),
        ]);

        await this.upper.addToBuffer(this.did, chunk, immediately);
      };

      this.events.addEventListener("encrypted", send, { once: true });
    } else {
      let chunk: Uint8Array;
      if (encrypt) {
        chunk = concatUint8Arrays([
          numberToUint8Array(1, 1),
          await encryptData(pack(data), this.did),
        ]);
      } else {
        chunk = concatUint8Arrays([numberToUint8Array(0, 1), pack(data)]);
      }

      await this.addToBuffer(chunk, immediately);
    }
  }

  sendKey(id: 0 | 1 = 0, initiator?: true) {
    this.sendMessage(
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

  clearBuffer() {
    this.buffer.data = [];
    this.buffer.state = "idle";
  }

  abstract signal(data: SignalData): void;

  // Encryption

  async handle(data: Uint8Array) {
    const handleDecoded = async (data: webRTCData) => {
      if (data.type != "chunk") console.log(data);

      if (data.type == "update") {
        const id = await this.setKey(data.key, data.id === 0 ? 1 : 0);
        if (data.initiator) this.sendKey(id);
      } else {
        await manager.handle(data, this.did);
      }
    };

    if (uint8ArrayToNumber(data.slice(0, 1)) === 1) {
      if (this.key !== undefined) {
        handleDecoded(
          unpack(await decryptData(data.slice(1), this.did)) as webRTCData,
        );
      } else {
        const decrypt = async () => {
          handleDecoded(
            unpack(await decryptData(data.slice(1), this.did)) as webRTCData,
          );
        };

        this.events.addEventListener("encrypted", decrypt, { once: true });
      }
    } else {
      await handleDecoded(unpack(data.slice(1)) as webRTCData);
    }
  }

  private getKeyData() {
    if (this.key !== undefined) return this.key;
    else {
      throw new Error("Encryption: Keys not yet exchanged");
    }
  }

  getKey() {
    const key = this.getKeyData();
    return { data: key.data, id: key.id };
  }

  private async setKey(jsonKey: JsonWebKey, id: 0 | 1) {
    const key = await importKey(jsonKey, true);
    if (this.key !== undefined) {
      const previousKey = await crypto.subtle.exportKey("jwk", this.key.data);
      const newKey = await crypto.subtle.exportKey("jwk", key);

      if (JSON.stringify(previousKey) == JSON.stringify(newKey))
        return this.key.id;
    }

    this.key = { data: await importKey(jsonKey, true), counter: 0, id };

    this.events.dispatchEvent(new Event("encrypted"));
    return id;
  }

  increaseCounter() {
    return ++this.getKeyData().counter;
  }
}

interface TurnCredentials {
  username: string;
  password: string;
}

class WebRTC extends Transport {
  private turn: TurnCredentials;
  private peer: SimplePeer.Instance;

  constructor(
    peer: Peer,
    did: number,
    initiator: boolean,
    credentials: TurnCredentials,
    events?: EventTarget,
    buffer?: Uint8Array[],
  ) {
    super(peer, did, initiator, events, buffer);

    this.turn = credentials;
    this.peer = this.establish();
  }

  private deletePeer(err?: Error) {
    if (err !== undefined) {
      console.warn(err);
      this.events.dispatchEvent(new Event("error"));
    } else console.log("Peer: Connection closed");

    this.upper?.closeConnections(this.did);
  }

  private establish() {
    console.log("Peer: Establishing WebRTC connection");

    const peer = new SimplePeer({
      initiator: this.initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, // Google STUN
          {
            urls: "turns:turn.wir-sind-frey.de:443", // Only TURN over TLS
            username: this.turn.username,
            credential: this.turn.password,
          },
          {
            urls: "turn:turn.wir-sind-frey.de:3478", // STUN and TURN over UDP
            username: this.turn.username,
            credential: this.turn.password,
          },
          // {
          //   urls: "turn:turn.wir-sind-frey.de:3478?transport=tcp", // Only TURN over TCP
          //   username: (await this.turn).username,
          //   credential: (await this.turn).password,
          // },
        ],
      },
    });

    // Listeners

    peer.on("signal", (data) => {
      if (onGuestPage())
        apiClient("ws").sendMessage({
          type: "shareFromGuest",
          data: {
            did: this.did,
            guestTransfer: String(get(page).url.searchParams.get("id")),
            data: { type: "signal", data: JSON.stringify(data) },
          },
        });
      else
        apiClient("ws").sendMessage({
          type: "share",
          data: {
            did: this.did,
            data: { type: "signal", data: JSON.stringify(data) },
          },
        });
    });

    peer.on("connect", () => this.events.dispatchEvent(new Event("connected")));

    peer.on("data", async (data) => {
      this.handle(data);
    });

    peer.on("close", this.deletePeer);
    peer.on("error", (err) => this.deletePeer(err));

    // Timeout

    if (this.initiator) {
      const timer = setTimeout(() => {
        this.events.removeEventListener("connected", onConnected);
        this.events.removeEventListener("destroyed", onDestroyed);
        this.close();
        const saved = createEmptyPromise();
        this.upper.replace(
          this.did,
          new WebSocket(
            this.upper,
            this.did,
            this.initiator,
            saved.promise,
            this.events,
            this.buffer.data,
          ),
        );
        saved.resolve();
      }, 1500);

      const onConnected = () => {
        clearTimeout(timer);
        this.events.removeEventListener("destroyed", onDestroyed);
      };
      const onDestroyed = () => {
        clearTimeout(timer);
        this.events.removeEventListener("connected", onConnected);
      };
      this.events.addEventListener("connected", onConnected, { once: true });
      this.events.addEventListener("destroyed", onDestroyed, { once: true });
    }

    return peer;
  }

  close() {
    this.peer.off("close", this.deletePeer);
    this.peer.off("error", (err) => this.deletePeer(err));

    if (!this.peer.destroyed) this.peer.destroy();
    this.events.dispatchEvent(new Event("destroyed"));
  }

  sendChunk(chunk: Uint8Array) {
    if (this.peer.writable) {
      return new Promise<void>((resolve) =>
        this.peer.write(chunk, undefined, () => resolve()),
      );
    } else {
      throw new Error("Peer: WebRTC instance not writable");
    }
  }

  signal(data: SignalData) {
    this.peer.signal(data);
  }
}

class WebRTCBuffer extends Transport {
  signalBuffer: SignalData[];

  constructor(
    peer: Peer,
    did: number,
    initiator: boolean,
    saved: Promise<void>,
  ) {
    super(peer, did, initiator);

    this.signalBuffer = [];

    saved.then(() => {
      for (const data of this.signalBuffer) {
        this.upper.signal(this.did, data);
      }
      this.close();
    });
  }

  close() {
    this.events.dispatchEvent(new Event("destroyed"));
  }

  sendChunk(chunk: Uint8Array) {}

  signal(data: SimplePeer.SignalData) {
    this.signalBuffer.push(data);
  }
}

class WebSocket extends Transport {
  constructor(
    peer: Peer,
    did: number,
    initiator: boolean,
    saved: Promise<void>,
    events?: EventTarget,
    buffer?: Uint8Array[],
  ) {
    super(peer, did, initiator, events, buffer);

    console.log("Peer: Established WebSocket connection");
    saved.then(() => this.events.dispatchEvent(new Event("connected")));
  }

  close() {
    this.events.dispatchEvent(new Event("destroyed"));
  }

  sendChunk(chunk: Uint8Array) {
    apiClient("ws").sendMessage(
      onGuestPage()
        ? {
            type: "shareFromGuest",
            data: {
              did: this.did,
              guestTransfer: String(get(page).url.searchParams.get("id")),
              data: { type: "webrtc", data: chunk },
            },
          }
        : {
            type: "share",
            data: {
              did: this.did,
              data: { type: "webrtc", data: chunk },
            },
          },
    );
  }

  signal(data: SignalData) {
    console.warn("Peer: Discarded signal data");
  }
}

class Peer {
  private connections: Transport[];

  private turn: TurnCredentials | undefined;

  constructor() {
    this.connections = [];
  }

  private async getTurnCredentials() {
    if (this.turn === undefined) {
      this.turn = await apiClient("ws").sendMessage({
        type: "getTurnCredentials",
      });
    }

    return this.turn;
  }

  async connect(
    did: number,
    initiator: boolean,
    events?: EventTarget,
    forceWebSocket?: boolean,
    forceOverwrite?: boolean,
  ) {
    if (this.connections[did] !== undefined && !forceOverwrite)
      return this.connections[did];

    if (forceWebSocket || !SimplePeer.WEBRTC_SUPPORT) {
      const saved = createEmptyPromise();
      this.connections[did] = new WebSocket(
        this,
        did,
        initiator,
        saved.promise,
        events,
      );
      saved.resolve();
    } else {
      const saved = createEmptyPromise();
      this.connections[did] = new WebRTCBuffer(
        this,
        did,
        initiator,
        saved.promise,
      );
      this.connections[did] = new WebRTC(
        this,
        did,
        initiator,
        await this.getTurnCredentials(),
        events,
      );
      saved.resolve();
    }

    return this.connections[did];
  }

  replace(did: number, replacement: Transport) {
    this.connections[did] = replacement;
  }

  async closeConnections(did?: number | IDeviceInfo[][] | "websocket") {
    if (did !== undefined) {
      if (typeof did === "number") {
        // Close specific connection
        const conn = this.connections[did];
        if (conn !== undefined) {
          delete this.connections[did];
          await conn.close();
        }
      } else if (did == "websocket") {
        // Close all websocket connections
        for (const conn of this.connections) {
          if (conn instanceof WebSocket) {
            delete this.connections[conn.did];
            conn.close();
          }
        }
      } else {
        // Close connections to offline contacts
        const dIds: number[] = [];

        for (const udIds of did) {
          dIds.push(...udIds.map((d) => d.did));
        }

        this.connections = this.connections.filter(async (c, i) => {
          if (!dIds.some((d) => i === d)) {
            await c.close();
          } else return true;
        });
      }
    } else {
      // Close all connections
      for (const conn of this.connections) {
        conn.close();
      }

      this.connections.length = 0;
    }
  }

  async signal(did: number, data: SignalData) {
    return (await this.getConnectionConnect(did, false)).signal(data);
  }

  clearBuffer(did?: number) {
    if (did === undefined) {
      for (const peer of this.connections) {
        peer.clearBuffer();
      }
    } else this.connections[did]?.clearBuffer();
  }

  private getConnection(did: number, topic: string) {
    const conn = this.connections[did];
    if (conn !== undefined) return conn;
    else {
      throw new Error(`${topic}: Peers not connected`);
    }
  }

  private getConnectionConnect(
    did: number,
    initiator: boolean,
    forceWebSocket?: boolean,
  ) {
    const connect = () =>
      this.connect(did, initiator, undefined, forceWebSocket, true);

    const conn = this.connections[did];
    if (conn === undefined) return connect();
    else if (forceWebSocket && conn instanceof WebRTC) {
      conn.close();
      return connect();
    } else return conn;
  }

  addToBuffer(did: number, chunk: Uint8Array, immediately: boolean) {
    return this.getConnection(did, "Peer").addToBuffer(chunk, immediately);
  }

  async sendMessage(
    did: number,
    data: webRTCData,
    encrypt?: boolean,
    immediately?: boolean,
  ) {
    return (await this.getConnectionConnect(did, true)).sendMessage(
      data,
      encrypt,
      immediately,
    );
  }

  // Encryption

  async handle(did: number, data: Uint8Array) {
    return (await this.getConnectionConnect(did, false, true)).handle(data);
  }

  getKey(did: number) {
    return this.getConnection(did, "Encryption").getKey();
  }

  increaseCounter(did: number) {
    return this.getConnection(did, "Encryption").increaseCounter();
  }
}
