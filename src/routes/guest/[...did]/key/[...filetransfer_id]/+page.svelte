<script lang="ts">
  import "beercss";
  import "material-dynamic-colors";

  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";
  import { page } from "$app/stores";
  import { setup as pgp_setup } from "$lib/lib/openpgp";
  import { returnProgress } from "$lib/lib/UI";

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
  let incoming_filetransfers = writable<IIncomingFiletransfer[]>([]);

  onMount(async () => {
    const { openPeer, connectAsListener } = await import("$lib/peerjs/main");
    incoming_filetransfers = (await import("$lib/peerjs/common")).incoming_filetransfers;
    disconnectPeer = (await import("$lib/peerjs/main")).disconnectPeer;

    pgp_setup();
    openPeer();

    connectAsListener(Number($page.params.did), $page.params.filetransfer_id);
  });

  const returnSubstring = (file_name: string) => {
    let position = file_name.lastIndexOf(".");

    if (position != -1) {
      let end = file_name.slice(position);

      return file_name.slice(0, 25 - end.length) + end;
    }
  };
</script>

<article style="width: 300px" class="center middle">
  <h5 class="center-align">Fileplay</h5>
  <nav class="center-align">
    <button style="width: 25%" on:click={() => disconnectPeer()}>Cancel</button>
    <button style="width: 25%" on:click={() => window.location.href = "/"}>Sign Up</button>
  </nav>

  <p class="small"><br /></p>

  {#if $incoming_filetransfers.length == 0}
    <p class="center-align large-text">{finalString}</p>
  {:else}
    <p style="display: none;">{clearInterval(animationInterval)}</p>
  {/if}
  {#each $incoming_filetransfers as filetransfer}
    {#each filetransfer.files as file}
      <div style="margin-bottom: 5px;">
        <div class="no-space row center-align">
          {#if file.url}
            <article class="border left-round" style="width: 80%; height: 50px;">
              <span
                >{file.file_name.length > 25
                  ? returnSubstring(file.file_name)
                  : file.file_name}</span
              >
              <div class="tooltip">{file.file_name}</div>
            </article>
            <a
              href={file.url}
              download={file.file_name}
            >
              <button
                disabled={!file.url}
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
                  filetransfer.filetransfer_id,
                  $incoming_filetransfers
                )}"
                id={file.file_id}
              />
              <span>
                {file.file_name.length > 25
                  ? returnSubstring(file.file_name)
                  : file.file_name}
              </span>
              <div class="tooltip">{file.file_name}</div>
            </article>
          {/if}
        </div>
      </div>
    {/each}
  {/each}
</article>

<style>
  p.small {
    line-height: 0.2;
  }
</style>
