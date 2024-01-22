import { page } from "$app/stores";
import { decode, encode } from "@msgpack/msgpack";
import SimplePeer from "simple-peer";
import { get, writable } from "svelte/store";

import { concatArrays, type webRTCData } from "$lib/sharing/common";
import { handleData } from "$lib/sharing/main";
import { trpc } from "$lib/trpc/client";

import { decryptData, encryptData, publicKeyJwk } from "./encryption";
import { numberToUint8Array, uint8ArrayToNumber } from "./utils";

export const connections = writable<
  {
    data: SimplePeer.Instance;
    events: EventTarget;
    encryption?: { key: CryptoKey; counter: number }; // key: ECDH PublicKey
  }[]
>([]);
export const buffer = writable<Uint8Array[][]>([]);

export const sendMessage = async (
  data: webRTCData,
  did: number,
  encrypt = true,
) => {
  console.log("WebRTC: sendMessage function.");
  const infos = get(connections)[did];

  const addToBuffer = (chunk: Uint8Array) => {
    buffer.update((buffer) => {
      if (buffer[did] === undefined) buffer[did] = [];
      buffer[did].push(chunk);
      return buffer;
    });
  };

  if (encrypt && infos !== undefined && infos.encryption !== undefined) {
    const chunk = concatArrays([
      numberToUint8Array(1, 1),
      await encryptData(encode(data), did),
    ]);
    addToBuffer(chunk);
  } else if (infos !== undefined && infos.encryption !== undefined) {
    const chunk = concatArrays([numberToUint8Array(0, 1), encode(data)]);
    addToBuffer(chunk);
  }

  let peer = get(connections)[did];
  if (peer === undefined || peer.data.closed || peer.data.destroyed) {
    const events = new EventTarget();

    if (encrypt) {
      const send = async () => {
        console.log("WebRTC: Received 'encrypted' event.");

        const chunk = concatArrays([
          numberToUint8Array(1, 1),
          await encryptData(encode(data), did),
        ]);
        addToBuffer(chunk);
        events.removeEventListener("encrypted", send);
        sendMessages(did);
      };

      events.addEventListener("encrypted", send);
    }

    peer = { data: connectToDevice(did, true, events), events };
    return;
  }

  if (get(buffer)[did] === undefined || get(buffer)[did].length > 1) return;

  if (peer.data.connected) {
    sendMessages(did, peer.data);
  }
};

const sendMessages = (did: number, peerParameter?: SimplePeer.Instance) => {
  if (get(buffer)[did] === undefined || get(buffer)[did].length <= 0) return;

  let peer: SimplePeer.Instance;
  if (peerParameter !== undefined) {
    peer = peerParameter;
  } else {
    peer = get(connections)[did].data;
  }

  if (peer === undefined || peer.closed || peer.destroyed) {
    connectToDevice(did, true);
    return;
  }

  buffer.update((buffer) => {
    peer.write(buffer[did][0], undefined, () => sendMessages(did, peer));

    buffer = buffer.slice(1);
    return buffer;
  });
};

export const connectToDevice = (did: number, initiator: boolean, events?: EventTarget) => {
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
      () => sendMessages(did, peer),
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
    connections[did] = { data: peer, events: events !== undefined ? events : new EventTarget() };
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
