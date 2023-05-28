<script lang="ts">
  import Card from "@smui/card";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import { page } from '$app/stores';

  import '$lib/../theme/typography.scss'

  let recieved_files = writable<{ url: string, name: string }[]>([]);

  onMount(async () => {
    const { setup, connectAsListener } = await import('$lib/peerjs');
    recieved_files = (await import('$lib/peerjs')).recieved_files;

    setup("");

    let reciever_uuid = $page.params.uuid;
    let listen_key = $page.params.listen_key;
    connectAsListener(reciever_uuid, listen_key);
  });
</script>

<div class="center">
  {#if $recieved_files.length != 0}
    <Card padded>
      <h6>Recieved file(s):</h6>
      <p class="small"><br /></p>

      {#each $recieved_files as recieved_file}
        <a href={recieved_file.url} download={recieved_file.name}>{recieved_file.name}</a><br/>
      {/each}
    </Card>
  {:else}
    <Card padded>
      <h6>Waiting for files...</h6>
    </Card>
  {/if}
</div>

<style>
  p.small {
    line-height: 0.2;
  }
  .center {
    display: flex;
    flex-direction: column;
    gap: 5px;
    justify-content: center;
    align-items: center;
    text-align: center;
    min-height: 100vh;
  }
</style>
