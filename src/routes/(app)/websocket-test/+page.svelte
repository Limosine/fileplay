<script lang="ts">
  import Button from "@smui/button";
  import { onMount } from "svelte";


  let websocket: WebSocket;
  onMount(() => {
    websocket = new WebSocket('wss://dev.fileplay.pages.dev/websocket-t2');
    websocket.addEventListener('message', event => {
    console.log('Message received from server');
    console.log(event.data);
    });
  });

  const message = () => {
    websocket.send("isOnline");
  }

</script>
<Button on:click={message}>
  SendMessage
</Button>