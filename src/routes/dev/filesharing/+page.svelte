<script lang="ts">
  import { sendFile } from "$lib/fileshare";
  import Peer from "peerjs";

  let remotePeerIds: string[] = ["4321F", "1234F"];
  let connections: any[] = [];

  const changeFiles = (event: Event) => {
    if (event?.target && event.target instanceof HTMLInputElement) {
      let files = (event.target as HTMLInputElement).files;
      if (!files) return;
      const file = files.item(0);
      const arr: any[] = [];
      arr.push(files);
      console.log(arr);
      if (!file) return;
      // const blob = new Blob(arr, { type: file.type });
      // connections.forEach((conn) => {
      //   conn.send({
      //     file: blob,
      //     filename: file.name,
      //     filetype: file.type,
      //   });
      // });

      sendFile(me, remotePeerIds, files);
    }
  };

  const stunServerUrl = "stun:stun.l.google.com:19302";
  let me: Peer;

  const connect = () => {
    me = new Peer("224F", {
      host: "localhost",
      port: 9000,
      path: "/myapp",
    });

    me.on("open", (id) => {
      console.log("Connected: ", id);
    });
  };
  //   setTimeout(() => {
  //     let conn = me.connect("1234F");
  //     let conn2 = me.connect("4321F");
  //     console.log(conn.open);
  //     console.log("Underlying connection: ", conn);
  //     remotePeerIds.push(conn.peer);
  //     remotePeerIds.push(conn2.peer);
  //     conn.on("open", () => {
  //       console.log("FileSharing: Connected with ", conn.peer);

  //       connections.push(conn);
  //     });

  //     conn2.on("open", () => {
  //       console.log("FileSharing2: Connected with ", conn2.peer);

  //       connections.push(conn2);
  //     });
  //   }, 3000);
  // };

  const sendMessage = () => {
    connections.forEach((conn) => {
      conn.send("Hello");
    });
  };

  const info = () => {
    console.log(me.connections);
  };
</script>

<button on:click={connect}>Connect</button>
<button on:click={sendMessage}>Send</button>
<button on:click={info}> INFO </button>

<input type="file" name="file" id="file" on:change={(e) => changeFiles(e)} />
