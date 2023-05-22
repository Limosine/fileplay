<script lang="ts">
  import Peer from "peerjs";

  let remotePeerIds = [];
  let connections: any[] = [];

  const stunServerUrl = "stun:stun.l.google.com:19302";

  const connect = () => {
    let me = new Peer("224F", {
      host: "localhost",
      port: 9000,
      path: "/myapp",
    });

    me.on("open", (id) => {
      console.log("Connected: ", id);
    });

    setTimeout(() => {
      let conn = me.connect("1234F");
      let conn2 = me.connect("4321F");
      console.log(conn.open);
      console.log("Underlying connection: ", conn);
      remotePeerIds.push(conn.peer);
      remotePeerIds.push(conn2.peer);
      conn.on("open", () => {
        console.log("FileSharing: Connected with ", conn.peer);

        connections.push(conn);
      });

      conn2.on("open", () => {
        console.log("FileSharing2: Connected with ", conn2.peer);

        connections.push(conn2);
      });
    }, 3000);
  };

  const sendMessage = () => {
    connections.forEach((conn) => {
      conn.send("Hello");
    });
  };
</script>

<button on:click={connect}>Connect</button>
<button on:click={sendMessage}>Send</button>
