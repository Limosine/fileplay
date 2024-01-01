import { writable } from "svelte/store";
import type SimplePeer from "simple-peer";
// @ts-ignore
import Peer from "@thaunknown/simple-peer";

import { sendMessage, updateDevice, updateWebRTC } from "./fetchers";

declare const Peer: SimplePeer.SimplePeer;
const peers = writable<SimplePeer.Instance[]>();

export const createPeer = () => {
  const shareData = () => {
    updateWebRTC(JSON.stringify(dataArray), "");
  };

  const peer = new Peer({
    initiator: true,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19305" },
        { urls: "stun:stun1.l.google.com:19305" }
      ]
    }
  });

  const dataArray: SimplePeer.SignalData[] = [];
  let timeout: NodeJS.Timeout;
  
  peer.on("signal", data => {
    dataArray.push(data);
    if (dataArray.length === 5) {
      clearTimeout(timeout);
      shareData();
    } else if (data.type == "candidate" && dataArray.length === 2) {
      timeout = setTimeout(() => {
        shareData();
      }, 500); // not necessary (200ms should be sufficient)
    }
  });

  peers.set([peer]);
};

// new WebTorrent({
//   tracker: {
//     announce: [
//       "wss://tracker.webtorrent.dev",
//       "wss://tracker.openwebtorrent.com"
//     ],
//     rtcConfig: {
//       iceServers: [
//         { urls: "stun:stun.l.google.com:19305" },
//         { urls: "stun:stun1.l.google.com:19305" }
//       ]
//     }
//   }
// });