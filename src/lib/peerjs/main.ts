import { get } from "svelte/store";
import Peer, { type DataConnection } from "peerjs";

import { connections, link, peer, sender_uuid } from "./common";
import {
  send,
  sendAccept,
  sendChunkRequest,
  sendChunked,
  sendInfos,
} from "./send";
import { handleChunk, handleFileInfos, handleFinish } from "./handle";

const openPeer = async (uuid?: string) => {
  return new Promise<void>(async (resolve) => {
    const res = await fetch("/api/turn", {
      method: "GET",
    });

    const turnServerConfig: {
      turnUrl: string;
      turnPassword: string;
      turnUsername: string;
    } = await res.json();
  
    const config = {
      iceServers: [
        {
          urls: `turn:${turnServerConfig.turnUrl}`,
          username: turnServerConfig.turnUsername,
          credential: turnServerConfig.turnPassword,
        },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    };
  
    if (uuid) {
      peer.set(
        new Peer(uuid, {
          config,
          debug: 3,
        })
      );
    } else
      peer.set(
        new Peer({
          config,
          debug: 3,
        })
      );
  
    peer.set(
      get(peer).on("open", (id) => {
        sender_uuid.set(id);
        resolve();
      })
    );
  })
};

export const disconnectPeer = () => {
  get(peer).disconnect();
};

const listen = () => {
  peer.set(
    get(peer).on("connection", (conn) => {
      connections.set([...get(connections), conn]);

      conn.on("data", function (received_data) {
        handleData(received_data, conn);
      });
    })
  );
};

export const handleData = (data: any, conn: DataConnection) => {
  console.log(data);

  // Sender:
  if (data.type == "Accept") {
    sendInfos(conn.peer, data.filetransfer_id);
    sendChunked(conn.peer, data.filetransfer_id, 0);
  } else if (data.type == "ChunkRequest") {
    sendChunked(conn.peer, data.filetransfer_id, data.chunk_id, data.file_id);

    // Receiver:
  } else if (data.type == "Request") {
    sendAccept(conn.peer, data.filetransfer_id);
  } else if (data.type == "FileInfos") {
    handleFileInfos(data);
  } else if (data.type == "Chunk") {
    handleChunk(data.chunk_info.chunk, data.chunk_info.file_id);
    sendChunkRequest(
      conn.peer,
      data.filetransfer_id,
      data.chunk_info.chunk_id + 1,
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

export const setup = async (uuid?: string) => {
  await openPeer(uuid);
  listen();
};
