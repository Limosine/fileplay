import type { DataConnection } from "peerjs";
import Peer from "peerjs";
import { get, writable } from "svelte/store";

let peer: Peer;
export const sender_uuid = writable<string>();

let connections: DataConnection[] = [];

export const recieved_files = writable<{ url: string, name: string }[]>([]);

const openPeer = (uuid: string) => {
  if (uuid){
    peer = new Peer(uuid);
  } else peer = new Peer();

  peer.on("open", (id) => {
    sender_uuid.set(id);
  });
};

export const disconnectPeer = () =>{
  peer.disconnect;
};

const listen = () => {
  peer.on("connection", (conn) => {
    conn.on("data", function(received_data) {
      handleData(received_data);
    });
  });
};

const handleData = (data: any) => {
  if (Array.isArray(data.file) && Array.isArray(data.filename)){
    for (let i = 0; i < data.file.length; i++){
      let url = createFileURL(data.file[i]);
      let info = {
        url: url,
        name: data.filename[i],
      };

      recieved_files.set([
        ...get(recieved_files),
        info,
      ]);
    };
  }
};

const createFileURL = (c_file: ArrayBuffer) => {
  var blob = new Blob([c_file]);
  var url = URL.createObjectURL(blob);
  return url;
};

export function connect(reciever_uuid: string): (DataConnection | false) {

  let conn: DataConnection;
  for (conn of connections) {
    if (conn.peer == reciever_uuid) return conn;
  };

  return false;
};

export const send = (files: FileList, reciever_uuid: string) => {
  if (files) {

    let filenames: string[] = [];
    let file: File;
    for (file of Array.from(files)) {
      filenames.push(file.name);
    };

    let connect_return = connect(reciever_uuid);
    if (connect_return == false) {
    
      let conn = peer.connect(reciever_uuid);

      conn.on("open", function() {
  
        conn.send({
          file: Array.from(files),
          filename: filenames,
        });
      });

      connections.push(conn);
    } else {
      connect_return.send({
        file: Array.from(files),
        filename: filenames,
      });
    }
  };
};

export const multiSend = (files: FileList, reciever_uuids: string[]) => {
  let reciever_uuid: string;
  for (reciever_uuid of reciever_uuids) {
    send(files, reciever_uuid);
  };
};

export const setup = (uuid: string) => {
  openPeer(uuid);
  listen();
};