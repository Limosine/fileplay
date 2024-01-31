import { page } from "$app/stores";
import { decode, encode } from "@msgpack/msgpack";
import SimplePeer, { type SignalData } from "simple-peer";
import { get, writable } from "svelte/store";

import { concatArrays, type webRTCData } from "$lib/sharing/common";
import { handleData } from "$lib/sharing/main";
import { trpc } from "$lib/trpc/client";

import {
  decryptData,
  encryptData,
  publicKeyJwk,
  updateKey,
} from "./encryption";
import { numberToUint8Array, uint8ArrayToNumber } from "./utils";

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
    data: SimplePeer.Instance;
    events: EventTarget;
    key?: number; // key index
  }[];

  private keys: {
    data: CryptoKey; // ECDH PublicKey
    counter: number;
    id: 0 | 1; // Own key id
  }[];

  private buffer: Uint8Array[][] = [];

  constructor() {
    this.connections = [];
    this.keys = [];
    this.buffer = [];
  }

  // WebRTC

  private connect(did: number, initiator: boolean, events = new EventTarget()) {
    const peer = new SimplePeer({
      initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19305" },
          {
            urls: "turn:turn.wir-sind-frey.de:5349",
            username: "fileplay",
            credential: "9YYWrCUp34NCBa",
          },
        ],
      },
    });

    peer.on("signal", (data) => {
      if (window.location.pathname.slice(0, 6) == "/guest")
        trpc().guest.shareWebRTCData.query({
          did,
          guestTransfer: String(get(page).url.searchParams.get("id")),
          data: JSON.stringify(data),
        });
      else
        trpc().authorized.shareWebRTCData.query({
          did,
          data: JSON.stringify(data),
        });
    });

    if (initiator) {
      peer.on("connect", () => {
        peer.write(
          concatArrays([
            numberToUint8Array(0, 1),
            encode({
              type: "update",
              key: publicKeyJwk,
              id: 0,
            }),
          ]),
          undefined,
          () => this.sendMessages(did),
        );
      });
    }

    const handle = async (data: webRTCData) => {
      if (data.type == "update") {
        const id = await updateKey(did, data.key, data.id === 0 ? 1 : 0);
        if (!initiator) {
          peer.write(
            concatArrays([
              numberToUint8Array(0, 1),
              encode({
                type: "update",
                key: publicKeyJwk,
                id,
              }),
            ]),
            undefined,
            () => this.sendMessages(did),
          );
        }
      } else {
        handleData(data, did);
      }
    };

    peer.on("data", async (data) => {
      if (uint8ArrayToNumber(data.slice(0, 1)) === 1) {
        const infos = this.connections[did];
        if (infos === undefined) throw new Error("WebRTC: Unknown connection");
        if (infos.key !== undefined) {
          handle(decode(await decryptData(data.slice(1), did)) as webRTCData);
        } else {
          const decrypt = async () => {
            handle(decode(await decryptData(data.slice(1), did)) as webRTCData);
            infos.events.removeEventListener("encrypted", decrypt);
          };

          infos.events.addEventListener("encrypted", decrypt);
        }
      } else {
        handle(decode(data.slice(1)) as webRTCData);
      }
    });

    const deletePeer = () => {
      if (!peer.destroyed) peer.destroy();
      delete this.connections[did];
    };

    peer.on("close", deletePeer);
    peer.on("error", deletePeer);

    this.connections[did] = {
      data: peer,
      events,
    };

    return peer;
  }

  closeConnections() {
    this.connections.forEach((conn) => {
      conn.data.destroy();
    });
    this.connections = [];
  }

  private sendMessages(did: number) {
    if (this.buffer[did] === undefined || this.buffer[did].length <= 0) return;

    const peer = this.connections[did];

    if (peer === undefined) {
      this.connect(did, true);
    } else {
      peer.data.write(this.buffer[did][0], undefined, () =>
        this.sendMessages(did),
      );

      this.buffer = this.buffer.slice(1);
    }
  }

  async sendMessage(did: number, data: webRTCData, encrypt = true) {
    const peer = this.connections[did];

    const addToBuffer = (chunk: Uint8Array) => {
      if (this.buffer[did] === undefined) this.buffer[did] = [];
      this.buffer[did].push(chunk);
    };

    if (peer === undefined) {
      const events = new EventTarget();

      if (encrypt) {
        const send = async () => {
          const chunk = concatArrays([
            numberToUint8Array(1, 1),
            await encryptData(encode(data), did),
          ]);
          addToBuffer(chunk);
          events.removeEventListener("encrypted", send);
          this.sendMessages(did);
        };

        events.addEventListener("encrypted", send);
      }

      this.connect(did, true, events);
    } else if (peer.key !== undefined) {
      let chunk: Uint8Array;
      if (encrypt) {
        chunk = concatArrays([
          numberToUint8Array(1, 1),
          await encryptData(encode(data), did),
        ]);
      } else {
        chunk = concatArrays([numberToUint8Array(0, 1), encode(data)]);
      }

      addToBuffer(chunk);

      if (this.buffer[did].length === 1) {
        this.sendMessages(did);
      }
    }
  }

  signal(did: number, data: SignalData) {
    const peer = this.connections[did];

    if (peer !== undefined) {
      peer.data.signal(data);
    } else {
      this.connect(did, false).signal(data);
    }
  }

  clearBuffer(did?: number) {
    if (did === undefined) this.buffer = [];
    else this.buffer[did] = [];
  }

  // Encryption

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
