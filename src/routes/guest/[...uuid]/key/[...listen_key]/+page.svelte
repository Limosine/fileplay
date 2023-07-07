<script lang="ts">
  import Card from "@smui/card";
  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";
  import { page } from "$app/stores";
  import { setup as pgp_setup } from "$lib/openpgp";
  import LinearProgress from "@smui/linear-progress/src/LinearProgress.svelte";

  let waitingTemplateString = "Waiting for files";
  let finalString = waitingTemplateString;
  let counter = 0;
  const animationInterval = setInterval(() => {
    if (counter >= 3) {
      finalString = waitingTemplateString;
      counter = 0;
    } else {
      finalString = finalString.concat(".");
      counter++;
    }
  }, 500);

  onDestroy(() => {
    clearInterval(animationInterval);
  });

  let received_chunks = writable<
    {
      file_id: string;
      file_name: string;
      encrypted: string;
      chunk_number: number;
      chunks: string[];
      url?: string | undefined;
    }[]
  >([]);

  onMount(async () => {
    const { openPeer, connectAsListener } = await import("$lib/peerjs/main");
    received_chunks = (await import("$lib/peerjs/common")).received_chunks;

    pgp_setup();
    openPeer();

    let sender_uuid = $page.params.uuid;
    let filetransferID = $page.params.listen_key;
    connectAsListener(sender_uuid, filetransferID);
  });
</script>

<div class="center">
  <Card padded>
    {#if $received_chunks.length != 0 && $received_chunks.at(-1)}
      <h6>Received file(s):</h6>
      <p class="small"><br /></p>

      {#each $received_chunks as received_file_chunks}
        <div style="margin-bottom: 5px;">
          <LinearProgress
            style="text-align: left"
            progress={received_file_chunks.chunks.length /
              received_file_chunks.chunk_number}
            closed={!!received_file_chunks.url}
          />
          <Card padded>
            {#if received_file_chunks.url}
              <a
                href={received_file_chunks.url}
                download={received_file_chunks.file_name}
              >
                {received_file_chunks.file_name}
              </a>
            {:else}
              {received_file_chunks.file_name}
            {/if}
          </Card>
        </div>
      {/each}
    {:else}
      <h6>{finalString}</h6>
    {/if}
  </Card>
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
