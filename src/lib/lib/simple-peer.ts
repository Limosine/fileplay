import { page } from "$app/stores";
import { decode, encode } from "@msgpack/msgpack";
import SimplePeer from "simple-peer";
import { get, writable } from "svelte/store";

import { concatArrays, type webRTCData } from "$lib/sharing/common";
import { handleData } from "$lib/sharing/main";
import { trpc } from "$lib/trpc/client";

import {
  decryptData,
  encryptData,
  encryptionBuffer,
  publicKeyJwk,
} from "./encryption";
import { numberToUint8Array, uint8ArrayToNumber } from "./utils";

export const connections = writable<
  {
    data: SimplePeer.Instance;
    encryption?: { key: CryptoKey; counter: number }; // key: ECDH PublicKey
  }[]
>([]);
export const buffer = writable<Uint8Array[][]>([]);

export const sendMessage = async (
  data: webRTCData,
  did: number,
  encrypt = true,
) => {
  if (
    get(connections)[did] === undefined ||
    get(connections)[did].encryption === undefined
  ) {
    encryptionBuffer.update((buffer) => {
      if (buffer[did] === undefined) buffer[did] = [];
      buffer[did].push(encode(data));
      return buffer;
    });
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

    buffer.update((buffer) => {
      if (buffer[did] === undefined) buffer[did] = [];
      buffer[did].push(chunk);
      return buffer;
    });
  }

  let peer = get(connections)[did];
  if (peer === undefined || peer.data.closed || peer.data.destroyed)
    peer = { data: connectToDevice(did, true) };

  if (get(buffer)[did] === undefined || get(buffer)[did].length > 1) return;

  if (peer.data.connected) {
    sendMessages(peer.data, did);
  }
};

const sendMessages = (peer: SimplePeer.Instance, did: number) => {
  if (get(buffer)[did] === undefined || get(buffer)[did].length <= 0) return;

  if (peer.closed || peer.destroyed) connectToDevice(did, true);

  const chunk = get(buffer)[did][0];
  buffer.update((buffer) => {
    buffer = buffer.slice(1);
    return buffer;
  });

  peer.write(chunk, undefined, () => sendMessages(peer, did));
};

export const connectToDevice = (did: number, initiator: boolean) => {
  const peer = new SimplePeer({
    initiator,
    trickle: false,
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
    if (window.location.pathname.slice(0, 6) == "/guest") {
      const unsubscribe = trpc().getFromGuest.subscribe(
        {
          did,
          guestTransfer: get(page).params.filetransfer_id,
          data: JSON.stringify(data),
        },
        {
          onData: (data) => {
            peer.signal(JSON.parse(data.data));
            unsubscribe.unsubscribe();
          },
        },
      );
    } else trpc().shareWebRTCData.query({ did, data: JSON.stringify(data) });
  });

  peer.on("connect", () => {
    peer.write(
      concatArrays([
        numberToUint8Array(0, 1),
        encode({
          type: "update",
          key: publicKeyJwk,
        }),
      ]),
      undefined,
      () => sendMessages(peer, did),
    );
  });

  peer.on("data", async (data) => {
    if (uint8ArrayToNumber(data.slice(0, 1)) === 1) {
      handleData(
        decode(await decryptData(data.slice(1), did)) as webRTCData,
        did,
      );
    } else {
      handleData(decode(data.slice(1)) as webRTCData, did);
    }
  });

  peer.on("close", () => {
    if (!peer.destroyed) peer.destroy();
    connections.update((connections) => {
      delete connections[did];
      return connections;
    });
  });

  connections.update((connections) => {
    connections[did] = { data: peer };
    return connections;
  });

  return peer;
};

export const closeConnections = () => {
  get(connections).forEach((conn) => {
    conn.data.destroy();
  });
  connections.set([]);
};
