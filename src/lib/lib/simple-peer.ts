import { page } from "$app/stores";
import SimplePeer from "simple-peer";
import { get, writable } from "svelte/store";

import { trpc } from "$lib/trpc/client";
import type {
  Accept,
  Chunk,
  Error,
  FileFinished,
  FiletransferFinished,
  Request,
} from "$lib/sharing/common";
import { handleData } from "$lib/sharing/main";

export const connections = writable<SimplePeer.Instance[]>([]);
const buffer = writable<(Chunk | FileFinished | FiletransferFinished | Accept | Request | Error)[][]>([]);

export const sendMessage = (
  data: Chunk | FileFinished | FiletransferFinished | Accept | Request | Error,
  did: number,
) => {
  buffer.update(buffer => {
    if (buffer[did] === undefined) buffer[did] = [];
    buffer[did].push(data);
    return buffer;
  });

  let peer: SimplePeer.Instance;
  peer = get(connections)[did];
  if (peer === undefined || peer.closed || peer.destroyed) peer = connectToDevice(did, true);

  if (get(buffer)[did].length > 1) return;

  if (peer.connected) {
    sendMessages(peer, did);
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

  peer.write(JSON.stringify(chunk), undefined, () => sendMessages);
};

export const connectToDevice = (did: number, initiator: boolean) => {
  const peer = new SimplePeer({
    initiator,
    trickle: false,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19305" },
        { urls: "stun:stun1.l.google.com:19305" },
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

  peer.on("connect", () => sendMessages(peer, did));

  peer.on("data", (data) => {
    handleData(JSON.parse(new TextDecoder().decode(data)), did);
  });

  peer.on("close", () => {
    if (!peer.destroyed) peer.destroy();
    connections.update((connections) => {
      connections.splice(did, 1);
      return connections;
    });
  });

  connections.update((connections) => {
    connections[did] = peer;
    return connections;
  });

  return peer;
};

export const closeConnections = () => {
  get(connections).forEach((conn) => {
    conn.destroy();
  });
  connections.set([]);
};
