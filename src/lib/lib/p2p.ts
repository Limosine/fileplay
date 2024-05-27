import { page } from "$app/stores";
import { decode, encode } from "@msgpack/msgpack";
import SimplePeer, { type SignalData } from "simple-peer";
import { get, writable } from "svelte/store";
import type { MaybePromise } from "@sveltejs/kit";

import { apiClient } from "$lib/api/client";
import { concatUint8Arrays, type webRTCData } from "$lib/sharing/common";
import { manager } from "$lib/sharing/manager.svelte";

import {
  decryptData,
  encryptData,
  publicKeyJwk,
  updateKey,
} from "./encryption";
import type { IDeviceInfo } from "./fetchers";
import {
  numberToUint8Array,
  onGuestPage,
  uint8ArrayToNumber,
} from "./utils";

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

  async sendMessage(data: webRTCData, encrypt = true, immediately = false) {
    const addToBuffer = async (chunk: Uint8Array) => {
      if (immediately) {
        this.buffer.data.unshift(chunk);
      } else {
        this.buffer.data.push(chunk);
      }

      if (this.buffer.state == "idle") await this.sendMessages();
    };

    if (encrypt && this.key === undefined) {
      const send = async () => {
        this.events.removeEventListener("encrypted", send);

        const chunk = concatUint8Arrays([
          numberToUint8Array(1, 1),
          await encryptData(encode(data), this.did),
        ]);

        await addToBuffer(chunk);
      };

      this.events.addEventListener("encrypted", send);
    } else {
      let chunk: Uint8Array;
      if (encrypt) {
        chunk = concatUint8Arrays([
          numberToUint8Array(1, 1),
          await encryptData(encode(data), this.did),
        ]);
      } else {
        chunk = concatUint8Arrays([numberToUint8Array(0, 1), encode(data)]);
      }

      await addToBuffer(chunk);
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
        const id = await updateKey(this.did, data.key, data.id === 0 ? 1 : 0);
        if (data.initiator) this.sendKey(id);
      } else {
        manager.handle(data, this.did);
      }
    };

    if (uint8ArrayToNumber(data.slice(0, 1)) === 1) {
      if (this.key !== undefined) {
        handleDecoded(
          decode(await decryptData(data.slice(1), this.did)) as webRTCData,
        );
      } else {
        const decrypt = async () => {
          handleDecoded(
            decode(await decryptData(data.slice(1), this.did)) as webRTCData,
          );
          this.events.removeEventListener("encrypted", decrypt);
        };

        this.events.addEventListener("encrypted", decrypt);
      }
    } else {
      handleDecoded(decode(data.slice(1)) as webRTCData);
    }
  }

  getKey() {
    if (this.key !== undefined) {
      const key = this.key;
      return { data: key.data, id: key.id };
    } else {
      throw new Error("Encryption: Keys not yet exchanged");
    }
  }

  setKey(key: CryptoKey, id: 0 | 1) {
    this.key = { data: key, counter: 0, id };

    this.events.dispatchEvent(new Event("encrypted"));
    return id;
  }

  increaseCounter() {
    if (this.key !== undefined) {
      return ++this.key.counter;
    } else {
      throw new Error("Encryption: Keys not yet exchanged");
    }
  }

  getId() {
    if (this.key !== undefined) {
      return this.key.id;
    } else {
      throw new Error("Encryption: Keys not yet exchanged");
    }
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

  private establish() {
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

    const deletePeer = (err?: Error) => {
      if (!peer.destroyed) peer.destroy();
      if (err !== undefined) console.warn(err);

      this.events.dispatchEvent(
        new Event(err === undefined ? "closed" : "error"),
      );
    };

    peer.on("closed", deletePeer);
    peer.on("error", (err) => deletePeer(err));

    // Timeout

    const timer = setTimeout(() => {
      this.events.removeEventListener("connected", onConnected);
      this.close();
      this.upper.replace(
        this.did,
        new WebSocket(
          this.upper,
          this.did,
          this.initiator,
          this.events,
          this.buffer.data,
        ),
      );
    }, 1500);

    const onConnected = () => {
      this.events.removeEventListener("connected", onConnected);
      clearTimeout(timer);
    };

    this.events.addEventListener("connected", onConnected);

    return peer;
  }

  close() {
    this.peer.destroy();
    this.events.dispatchEvent(new Event("destroyed"));
  }

  sendChunk(chunk: Uint8Array) {
    if (this.peer.writable) {
      return new Promise<void>((resolve) =>
        this.peer.write(chunk, undefined, () => resolve()),
      );
    }
  }

  signal(data: SignalData) {
    this.peer.signal(data);
  }
}

class WebSocket extends Transport {
  constructor(
    peer: Peer,
    did: number,
    initiator: boolean,
    events?: EventTarget,
    buffer?: Uint8Array[],
  ) {
    super(peer, did, initiator, events, buffer);

    this.establish();
  }

  establish() {
    this.events.dispatchEvent(new Event("connected"));
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
      this.turn = (await apiClient("ws").sendMessage({
        type: "getTurnCredentials",
      })) as TurnCredentials;
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
    if (this.connections[did] !== undefined && !forceOverwrite) return;

    if (forceWebSocket || !SimplePeer.WEBRTC_SUPPORT) {
      this.connections[did] = new WebSocket(this, did, initiator, events);
    } else {
      this.connections[did] = new WebRTC(
        this,
        did,
        initiator,
        await this.getTurnCredentials(),
        events,
      );
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
        const dIds: number[] = []; // online

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
    const peer = this.connections[did];

    if (peer !== undefined) peer.signal(data);
    else (await this.connect(did, false))?.signal(data);
  }

  clearBuffer(did?: number) {
    if (did === undefined) {
      for (const peer of this.connections) {
        peer.clearBuffer();
      }
    } else this.connections[did]?.clearBuffer();
  }

  private getConnection(did: number) {
    const conn = this.connections[did];
    if (conn !== undefined) return conn;
    else {
      throw new Error("Encryption: Peers not connected");
    }
  }

  sendMessage(
    did: number,
    data: webRTCData,
    encrypt?: boolean,
    immediately?: boolean,
  ) {
    return this.getConnection(did).sendMessage(data, encrypt, immediately);
  }

  // Encryption

  handle(did: number, data: Uint8Array) {
    return this.getConnection(did).handle(data);
  }

  getKey(did: number) {
    return this.getConnection(did).getKey();
  }

  setKey(did: number, key: CryptoKey, id: 0 | 1) {
    return this.getConnection(did).setKey(key, id);
  }

  increaseCounter(did: number) {
    return this.getConnection(did).increaseCounter();
  }

  getId(did: number) {
    return this.getConnection(did).getId();
  }
}
