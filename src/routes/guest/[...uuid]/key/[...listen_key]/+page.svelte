<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";
  import { page } from "$app/stores";
  import { setup as pgp_setup } from "$lib/openpgp";
  import { goto } from "$app/navigation";

  let waitingTemplateString = "Fileplay";
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

  let disconnectPeer = () => {};
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
    disconnectPeer = (await import("$lib/peerjs/main")).disconnectPeer;

    pgp_setup();
    openPeer();

    let sender_uuid = $page.params.uuid;
    let filetransferID = $page.params.listen_key;
    connectAsListener(sender_uuid, filetransferID);
  });

  const returnProgress = (file_id: string, progress: number) => {
    ui(`#${file_id}`, progress);
    return "";
  }
</script>

<div class="center">
  <article style="width: 300px">
    {#if $received_chunks.length != 0 && $received_chunks.at(-1)}
      <h5 class="center-align">{waitingTemplateString}</h5>
    {:else}
      <h5 class="center-align">{finalString}</h5>
    {/if}
    <nav class="center-align">
      <button on:click={() => disconnectPeer()}>Cancel Filetransfer</button>
      <button on:click={() => goto("/")}>Sign Up</button>
    </nav>

    {#if $received_chunks.length != 0 && $received_chunks.at(-1)}
      <p class="small"><br /></p>
    {/if}

    {#each $received_chunks as received_file_chunks}
      <div style="margin-bottom: 5px;">
        <a
          href={received_file_chunks.url}
          download={received_file_chunks.file_name}
          style="width: 100%;"
        >
          <button
            disabled={!received_file_chunks.url}
            class="border large responsive"
          >
            {#if !received_file_chunks.url}
              <div class="progress left {returnProgress(received_file_chunks.file_id, (received_file_chunks.chunks.length / received_file_chunks.chunk_number)*100)}" id={received_file_chunks.file_id}/>
            {/if}
            <span>{received_file_chunks.file_name}</span>
          </button>
        </a>
      </div>
    {/each}
  </article>
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
