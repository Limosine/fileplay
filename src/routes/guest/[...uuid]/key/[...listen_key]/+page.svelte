<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";
  import { page } from "$app/stores";
  import { setup as pgp_setup } from "$lib/openpgp";
  import { goto } from "$app/navigation";

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
  };

  const returnSubstring = (file_name: string) => {
    let position = file_name.lastIndexOf(".");

    if (position != -1) {
      let end = file_name.slice(position);

      return file_name.slice(0, 25 - end.length) + end;
    }
  };
</script>

<div class="center">
  <article style="width: 300px">
    <h5 class="center-align">Fileplay</h5>
    <nav class="center-align">
      <button style="width: 25%" on:click={() => disconnectPeer()}>Cancel</button>
      <button style="width: 25%" on:click={() => goto("/")}>Sign Up</button>
    </nav>

    <p class="small"><br /></p>

    {#if $received_chunks.length == 0}
      <p class="center-align large-text">{finalString}</p>
    {:else}
      <p style="display: none;">{clearInterval(animationInterval)}</p>
    {/if}

    {#each $received_chunks as received_file_chunks}
      <div style="margin-bottom: 5px;">
        <div class="no-space row center-align">
          {#if received_file_chunks.url}
            <article class="border left-round" style="width: 80%; height: 50px;">
              <span>{(received_file_chunks.file_name.length > 25) ? returnSubstring(received_file_chunks.file_name) : received_file_chunks.file_name}</span>
              <div class="tooltip">{received_file_chunks.file_name}</div>
            </article>
            <a
              href={received_file_chunks.url}
              download={received_file_chunks.file_name}
            >
              <button
                disabled={!received_file_chunks.url}
                class="large right-round"
                style="padding: 0px 3px 0px 0px; margin: 0px; height: 50px;"
              >
                <i class="large">download</i>
              </button>
            </a>
          {:else}
            <article class="border round" style="width: 100%; height: 50px;">
                <div
                  class="progress left {returnProgress(
                    received_file_chunks.file_id,
                    (received_file_chunks.chunks.length /
                      received_file_chunks.chunk_number) *
                      100
                  )}"
                  id={received_file_chunks.file_id}
                />
              <span>{(received_file_chunks.file_name.length > 25) ? returnSubstring(received_file_chunks.file_name) : received_file_chunks.file_name}</span>
              <div class="tooltip">{received_file_chunks.file_name}</div>
            </article>
          {/if}
        </div>
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
