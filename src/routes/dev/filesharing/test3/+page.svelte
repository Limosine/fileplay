<script lang="ts">
  import { extractFileInfo } from "$lib/fileshare";
  import { Peer } from "peerjs";

  let message = "No message";
  let me: Peer;
  let file: {
    url: string;
    name: string;
  } = {
    url: "",
    name: "",
  };

  const prepare = () => {
    me = new Peer("4321F", {
      host: "localhost",
      port: 9000,
      path: "/myapp",
    });

    // let conn = me.connect("224F");
    // conn.on("open", () => {
    //   console.log("Reverse Conn from 4321F");
    // });

    me.on("open", () => {
      console.log("Connected");
    });

    me.on("connection", (conn) => {
      console.log("Connected with: ", conn.connectionId);
      console.log("hi")
      conn.on("data", (data: any) => {
        console.log("Received Data: ", data);

        if (data.file) {
          console.log("Stuff")
          let info = extractFileInfo(data);
          console.log(info)
          if (info?.fileName && info.url) {
            file.name = info.fileName;
            file.url = info.url;
          }
        }
      });
    });
  };
  const closeConn = () => {
    let conns = me.connections;
    console.log(conns);
  };
</script>

<!-- <button on:click={connect} /> -->

<div>{message}</div>
<button on:click={prepare}> PREPARE </button>
<button on:click={closeConn}> CLOSE </button>
<a href={file.url} download={file.name}>{file.name}</a>
