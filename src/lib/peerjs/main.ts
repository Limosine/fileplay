import { browser } from "$app/environment";
import { page } from "$app/stores";
import { get } from "svelte/store";
import Peer, { type DataConnection } from "peerjs";

import {
  addListeners,
  incoming_filetransfers,
  link,
  outgoing_filetransfers,
  peer,
  peer_disconnected,
  peer_open,
  sender_uuid,
} from "./common";
import { send, sendChunkFinish, sendChunk, sendRequest } from "./send";
import {
  handleRequest,
  handleChunk,
  handleChunkFinish,
  handleFileFinish,
  handleFileTransferFinished,
} from "./handle";
import { getCombined, getPeerJsId, updatePeerJS_ID } from "$lib/lib/fetchers";
import { deviceInfos, own_did } from "$lib/lib/UI";

export const openPeer = async (uuid?: string) => {
  if (uuid) {
    peer.set(new Peer(uuid));
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

export const disconnectPeer = (destroy?: boolean) => {
  peer_disconnected.set(true);
  if (destroy) get(peer).destroy();
  else get(peer).disconnect();
};

export const listen = () => {
  peer.update((peer) => {
    peer.on("connection", (conn) => {
      addListeners(conn);
    });
    return peer;
  });
};

const authenticated = async (
  peerID: string,
  filetransfer_id: string,
  type: string,
): Promise<boolean> => {
  // Guest page
  if (browser && window.location.pathname.slice(0, 6) == "/guest") {
    if ((await getPeerJsId(Number(get(page).params.did))) == peerID) {
      return true;
    } else return false;
  }

  // Home page - Skip if sending via link
  if (filetransfer_id !== undefined) {
    const filetransfer = get(outgoing_filetransfers).find(
      (filetransfer) =>
        filetransfer.filetransfer_id == filetransfer_id &&
        filetransfer.cid === undefined,
    );

    if (filetransfer !== undefined) return true;
  }

  // Home page - Get device of PeerJsId
  let device = (await get(deviceInfos)).find(
    (device) => device.peerJsId == peerID,
  );
  if (device === undefined) {
    await getCombined(["deviceInfos"]);
    device = (await get(deviceInfos)).find(
      (device) => device.peerJsId == peerID,
    );

    if (device === undefined) {
      return false;
    }
  }

  if (type == "Request") {
    return true;
  }

  // Home page - Get filetransfer (did + filetransfer_id)
  if (
    get(outgoing_filetransfers).find(
      (filetransfer) =>
        // @ts-ignore
        filetransfer.did == device.did &&
        filetransfer.filetransfer_id == filetransfer_id,
    ) === undefined &&
    get(incoming_filetransfers).find(
      (filetransfer) =>
        // @ts-ignore
        filetransfer.did == device.did &&
        filetransfer.filetransfer_id == filetransfer_id,
    ) === undefined
  ) {
    return false;
  } else {
    return true;
  }
};

export const handleData = async (data: any, conn: DataConnection) => {
  console.log(data);

  if (data.type == "Error") {
    console.warn(`PeerJS: ${data.body}`);
  } else if (await authenticated(conn.peer, data.filetransfer_id, data.type)) {
    // Sender:
    if (data.type == "Accept") {
      if (data.guest == true) sendRequest(conn.peer, data.filetransfer_id);
      else sendChunk(conn.peer, data.filetransfer_id);
    } else if (data.type == "ChunkFinished") {
      handleChunkFinish(
        conn.peer,
        data.filetransfer_id,
        data.file_id,
        data.chunk_id,
      );

      // Receiver:
    } else if (data.type == "Request") {
      handleRequest(
        conn.peer,
        data.filetransfer_id,
        data.encrypted,
        data.files,
        data.did,
      );
    } else if (data.type == "Chunk") {
      handleChunk(
        data.filetransfer_id,
        data.chunk_info.file_id,
        data.chunk_info.chunk,
      );
      setTimeout(() => {
        sendChunkFinish(
          conn.peer,
          data.filetransfer_id,
          data.chunk_info.chunk_id,
          data.chunk_info.file_id,
        );
      }, 400);
    } else if (data.type == "FileFinished") {
      handleFileFinish(data.filetransfer_id, data.file_id);
    } else if (data.type == "FiletransferFinished") {
      handleFileTransferFinished(data.filetransfer_id);
    }
  } else {
    conn.send({
      type: "Error",
      body: "401 Unauthorized",
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
        (await get(own_did)) +
        "/key/" +
        filetransfer_id,
    );
  }
};

export const connectAsListener = (did: number, filetransfer_id: string) => {
  get(peer).on("open", async () => {
    const conn = get(peer).connect(await getPeerJsId(did), {});

    conn.on("open", function () {
      conn.send({
        type: "Accept",
        filetransfer_id,
        guest: true,
      });
    });

    addListeners(conn);
  });
};
