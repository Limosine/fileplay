<script lang="ts">
  import Card from "@smui/card";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import { page } from "$app/stores";
  import { setup as pgp_setup } from "$lib/openpgp";
  import { transferHandler } from "$lib/stores/ReceivedFiles";

  let received_files = writable<{ url: string; name: string }[]>([]);
  let info = transferHandler.getInformation();
  const refreshTimer = setInterval(() => {
    info = transferHandler.getInformation();
  }, 10);

  onMount(async () => {
    const { setup, connectAsListener } = await import("$lib/peerjs");
    received_files = (await import("$lib/peerjs")).received_files;

    pgp_setup();
    setup();

    let sender_uuid = $page.params.uuid;
    let filetransfer_id = $page.params.listen_key;
    connectAsListener(sender_uuid, filetransfer_id);
  });

  const pending_string_template = "Waiting for files";
  let waiting: string;
  let index = -1;
  const interval = setInterval(() => {
    if ($received_files.length == 0) {
      if (index >= 3) {
        index = 0;
      } else index++;
    } else if (interval) {
      clearInterval(interval);
    }

    waiting = pending_string_template.padEnd(
      pending_string_template.length + index,
      "."
    );
  }, 500);
</script>

<div class="center">
  

  {#if $received_files.length != 0 && $received_files.at(-1)}
    <Card padded>
      <h6>Received file(s):</h6>
      <p class="small"><br /></p>

      {#each $received_files as received_file}
        <a href={received_file.url} download={received_file.name}
          >{received_file.name}</a
        ><br />
      {/each}
      {#if info.totalFiles > 0}
        <h6>Progress: {info.currentChunks} / 10</h6>
        <h6>{info.currentFiles} / {info.totalFiles}</h6>
      {/if}
    </Card>
  {:else}
    <Card padded>
      <h6>{waiting}</h6>
      {#if info.totalFiles > 0}
        <h6>Progress: {info.currentChunks} / 10</h6>
        <h6>{info.currentFiles} / {info.totalFiles}</h6>
      {/if}
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
