<script lang="ts">
  import { page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";

  import "beercss";

  import { setup as pgp_setup } from "$lib/lib/openpgp";
  import { closeConnections } from "$lib/lib/simple-peer";
  import { returnProgress } from "$lib/lib/UI";
  import { incoming_filetransfers } from "$lib/sharing/common";
  import { connectAsListener } from "$lib/sharing/main";

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

  onMount(async () => {
    pgp_setup();
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
    <button style="width: 25%" on:click={() => closeConnections()}
      >Cancel</button
    >
    <button style="width: 25%" on:click={() => (window.location.href = "/")}
      >Sign Up</button
    >
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
            <article
              class="border left-round"
              style="width: 80%; height: 50px;"
            >
              <span
                >{file.name.length > 25
                  ? returnSubstring(file.name)
                  : file.name}</span
              >
              <div class="tooltip">{file.name}</div>
            </article>
            <a href={file.url} download={file.name}>
              <button
                disabled={!file.url}
                class="large right-round"
                style="padding: 0px 3px 0px 0px; margin: 0px; height: 50px;"
              >
                <i class="large">download</i>
              </button>
            </a>
          {:else}
            <article
              class="border round row"
              style="width: 100%; height: 50px;"
            >
              <div>
                <span>
                  {file.name.length > 25
                    ? returnSubstring(file.name)
                    : file.name}
                </span>
                <div class="tooltip">{file.name}</div>
              </div>
              <div class="max" />
              <progress
                class="circle small"
                value={returnProgress(filetransfer.id, $incoming_filetransfers)}
              ></progress>
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
