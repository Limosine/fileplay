import { get } from "svelte/store";
import Peer, { type DataConnection } from "peerjs";

import { connections, link, peer, sender_uuid } from "./common";
import {
  send,
  sendAccept,
  sendChunkFinish,
  sendChunk,
  sendInfos,
} from "./send";
import { handleChunk, handleChunkFinish, handleFileInfos, handleFinish } from "./handle";
import { updatePeerJS_ID } from "$lib/personal";

export const openPeer = async (uuid?: string) => {
  if (uuid) {
    peer.set(new Peer(uuid, { debug: 3 }));
  } else peer.set(new Peer());

  peer.update((peer_self) => {
    peer_self.on("open", (id) => {
      console.log("Peer opened");
      sender_uuid.set(id);
      listen();
      // @ts-ignore
      if (localStorage.getItem("loggedIn")) {
        updatePeerJS_ID();
      }
    });

    peer_self.on("close", () => {
      console.log("Peer closed");
      openPeer(get(sender_uuid));
    });

    peer_self.on("disconnected", () => {
      console.log("Peer disconnected");
      openPeer(get(sender_uuid));
    });

    return peer_self;
  });
};

export const disconnectPeer = () => {
  get(peer).disconnect();
};

const listen = () => {
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

export const handleData = (data: any, conn: DataConnection) => {
  console.log(data);

  // Sender:
  if (data.type == "Accept") {
    sendInfos(conn.peer, data.filetransfer_id);
    sendChunk(conn.peer, data.filetransfer_id);
  } else if (data.type == "ChunkFinished") {
    handleChunkFinish(conn.peer, data.filetransfer_id, data.file_id, data.chunk_id);

    // Receiver:
  } else if (data.type == "Request") {
    sendAccept(conn.peer, data.filetransfer_id);
  } else if (data.type == "FileInfos") {
    handleFileInfos(data);
  } else if (data.type == "Chunk") {
    handleChunk(data.chunk_info.chunk, data.chunk_info.file_id);
    sendChunkFinish(
      conn.peer,
      data.filetransfer_id,
      data.chunk_info.chunk_id,
      data.chunk_info.file_id
    );
  } else if (data.type == "FileFinished") {
    handleFinish(data);
  } else {
    console.log(data);
  }
};

export const addPendingFile = async (files: FileList) => {
  let filetransfer_id = await send(files);

  if (filetransfer_id !== undefined) {
    link.set(
      "http://" +
        location.hostname +
        ":" +
        location.port +
        "/guest/" +
        get(sender_uuid) +
        "/key/" +
        filetransfer_id
    );
  }
};

export const connectAsListener = (
  receiver_uuid: string,
  filetransfer_id: string
) => {
  get(peer).on("open", (id) => {
    let conn = get(peer).connect(receiver_uuid);

    conn.on("open", function () {
      conn.send({
        type: "Accept",
        filetransfer_id,
      });
    });

    conn.on("data", function (received_data) {
      handleData(received_data, conn);
    });

    connections.set([...get(connections), conn]);
  });
};