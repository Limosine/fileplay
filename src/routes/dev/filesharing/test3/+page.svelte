<script lang="ts">
  import { onMount } from "svelte";

  let prepare: any;
  let me: any;

  onMount(async () => {
    const { extractFileInfo } = await import('$lib/fileshare');
    const { Peer } = await import('peerjs');

    me: Peer;

    prepare = () => {
    me = new Peer("4321F");

    // let conn = me.connect("224F");
    // conn.on("open", () => {
    //   console.log("Reverse Conn from 4321F");
    // });

    me.on("open", () => {
      console.log("Connected");
    });

    me.on("connection", (conn: any) => {
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
  });

  let message = "No message";
  let file: {
    url: string;
    name: string;
  } = {
    url: "",
    name: "",
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
