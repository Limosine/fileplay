import { get } from "svelte/store";
import Peer, { type DataConnection } from "peerjs";

import { connections, incoming_filetransfers, link, peer, peer_disconnected, peer_open, pending_filetransfers, sender_uuid } from "./common";
import {
  send,
  sendAccept,
  sendChunkFinish,
  sendChunk,
  sendRequest,
} from "./send";
import { handleRequest, handleChunk, handleChunkFinish, handleFileFinish, handleFileTransferFinished } from "./handle";
import { getCombined, updatePeerJS_ID } from "$lib/lib/fetchers";
import { deviceInfos, own_did } from "$lib/lib/UI";
import { browser } from "$app/environment";

export const openPeer = async (uuid?: string) => {
  if (uuid) {
    peer.set(new Peer(uuid, { debug: 3 }));
  } else peer.set(new Peer());

  peer.update((peer_self) => {
    peer_self.on("error", (err) => {
      // @ts-ignore
      if (err.type == "unavailable-id") {
        console.log("PeerJS: ID unavailable");
        peer_self.destroy();
      } else {
        console.log("PeerJS: Error", err);
      }
    });

    peer_self.on("open", (id) => {
      console.log("PeerJS: Peer opened");
      peer_open.set(true);
      sender_uuid.set(id);
      // @ts-ignore
      if (localStorage.getItem("loggedIn")) {
        updatePeerJS_ID();
      }
    });

    peer_self.on("close", () => {
      console.log("PeerJS: Peer closed");
      peer_open.set(false);
      if (!get(peer_disconnected)) {
        openPeer();
        listen();
      }
    });

    peer_self.on("disconnected", () => {
      console.log("PeerJS: Peer disconnected");
      peer_open.set(false);
      if (!get(peer_disconnected)) {
        reconnectPeer();
      }
    });

    return peer_self;
  });
};

export const reconnectPeer = () => {
  peer_disconnected.set(false);
  get(peer).reconnect();
};

export const disconnectPeer = () => {
  peer_disconnected.set(true);
  get(peer).disconnect();
};

export const listen = () => {
  peer.update((peer) => {
    peer.on("connection", (conn) => {
      conn.on("data", function (received_data) {
        handleData(received_data, conn);
      });

      connections.set([...get(connections), conn]);
    });
    return peer;
  });
};

const authenticated = async (peerID: string, filetransfer_id?: string): Promise<boolean> => {
  // skip as guest
  if (browser && window.location.pathname.slice(0, 6) == "/guest") {
    return true;
  } else if (filetransfer_id !== undefined) {
    const filetransfer = get(pending_filetransfers).find((filetransfer) => filetransfer.filetransfer_id == filetransfer_id && filetransfer.cid === undefined);

    if (filetransfer !== undefined) return true;
  }

  // PeerJsId changes, did remains the same
  let device = (await get(deviceInfos)).find((device) => device.peerJsId == peerID);

  if (device === undefined) {
    await getCombined(["deviceInfos"]);
    device = (await get(deviceInfos)).find((device) => device.peerJsId == peerID);

    if (device === undefined) {
      return false;
    }
  }

  // @ts-ignore
  if (get(pending_filetransfers).find((filetransfer) => filetransfer.did == device.did) === undefined && get(incoming_filetransfers).find((filetransfer) => filetransfer.did == device.did) === undefined) {
    return false;
  } else {
    return true;
  }
};

export const handleData = async (data: any, conn: DataConnection) => {
  console.log(data);

  if (data.type == "Request") {
    handleRequest(conn.peer, data.filetransfer_id, data.encrypted, data.files, data.did);
  } else if (data.type == "Error") {
    console.warn(data.body);
  } else if (await authenticated(conn.peer, data.filetransfer_id)) {
    // Sender:
    if (data.type == "Accept") {
      if (data.guest == true) sendRequest(conn.peer, data.filetransfer_id);
      sendChunk(conn.peer, data.filetransfer_id);
    } else if (data.type == "ChunkFinished") {
      handleChunkFinish(conn.peer, data.filetransfer_id, data.file_id, data.chunk_id);

      // Receiver:
    } else if (data.type == "Chunk") {
      handleChunk(data.chunk_info.chunk, data.chunk_info.file_id);
      sendChunkFinish(
        conn.peer,
        data.filetransfer_id,
        data.chunk_info.chunk_id,
        data.chunk_info.file_id
      );
    } else if (data.type == "FileFinished") {
      handleFileFinish(data);
    } else if (data.type == "FiletransferFinished") {
      handleFileTransferFinished(data.filetransfer_id);
    }
  } else {
    conn.send({
      type: "Error",
      body: "401",
    });
  }
};

export const addPendingFile = async (files: FileList) => {
  const filetransfer_id = await send(files);

  if (filetransfer_id !== undefined) {
    link.set(
      "http://" +
      location.hostname +
      ":" +
      location.port +
      "/guest/" +
      await get(own_did) +
      "/key/" +
      filetransfer_id
    );
  }
};

export const connectAsListener = (
  receiver_uuid: string,
  filetransfer_id: string
) => {
  get(peer).on("open", () => {
    const conn = get(peer).connect(receiver_uuid);

    conn.on("open", function () {
      conn.send({
        type: "Accept",
        filetransfer_id,
        guest: true,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  });
};