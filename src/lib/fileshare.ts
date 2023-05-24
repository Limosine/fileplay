import type { DataConnection } from "peerjs";
import Peer from "peerjs";

let connections: DataConnection[] = [];

export const sendFile = (
  senderID: string,
  receiverIDs: string[],
  files: FileList
) => {
  let sender = new Peer(senderID);
  console.log(connections);
  let arr: any[] = [];
  arr.push(files);
  let file = files[0];
  const blob = new Blob(arr, { type: file.type });
  if (connections.length == 0) {
    sender.on("open", () => {
      receiverIDs.forEach((id) => {
        let conn = sender.connect(id);
        conn.on("open", () => {
          console.log(blob, files);
          conn.send({
            file: blob,
            filename: file.name,
            filetype: file.type,
          });
        });
        connections.push(conn);
      });
    });
    connections.forEach((conn) => {
      conn.send({
        file: blob,
        filename: file.name,
        filetype: file.type,
      });
    });
  }

  // setTimeout(() => {

  //     let arr: any[] = [];
  //     arr.push(files);
  //     let file = files[0];
  //     connections.forEach((conn) => {
  //         const blob = new Blob(arr, { type: file.type });
  //         console.log(blob, files)
  //         conn.send({
  //             file: blob,
  //             filename: file.name,
  //             filetype: file.type,
  //         });
  //     })
  // }, 2500);
};

export const extractFileInfo = (data: any) => {
  console.log(data);
  var blob = new Blob([data.file], { type: data.filetype });
  var url = URL.createObjectURL(blob);
  return {
    fileName: data.filename,
    url,
  };
};
