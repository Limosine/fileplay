<script lang="ts">
  import Button from "@smui/button";
  import { onMount } from "svelte";


  let websocket: WebSocket;
  onMount(() => {
    websocket = new WebSocket('wss://dev.fileplay.pages.dev/websocket');
    websocket.addEventListener('message', event => {
      console.log(event.data);
    });
  });

  const message = () => {
    websocket.send("isOnline");
  }

//   const websocket = new WebSocket('wss://dev.fileplay.pages.dev/websocket');
// websocket.addEventListener('message', event => {
//   console.log(event.data);
// });
// websocket.addEventListener('open', event => {
//   websocket.send("isOnline");
// })


</script>
<Button on:click={message}>
  SendMessage
</Button>