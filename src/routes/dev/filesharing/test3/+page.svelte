<script lang="ts">
  import { Peer } from "peerjs";

  let message = "No message";
  const prepare = () => {
    let me = new Peer("4321F", {
      host: "localhost",
      port: 9000,
      path: "/myapp",
    });

    me.on("open", () => {
      console.log("Connected");
    });

    me.on("connection", (conn) => {
      console.log("Connected with: ", conn.connectionId);
      conn.on("data", (data) => {
        console.log("Received Data: ", data);

        message = String(data);
      });
    });
  };
</script>

<!-- <button on:click={connect} /> -->

<div>{message}</div>
<button on:click={prepare}> PREPARE </button>
