<script lang="ts">
  import { page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";

  import "beercss";

  import { setup } from "$lib/lib/encryption";
  import { closeConnections } from "$lib/lib/simple-peer";
  import { incoming_filetransfers } from "$lib/sharing/common";
  import { connectAsListener } from "$lib/sharing/main";
  import Input, { files, input } from "$lib/components/Input.svelte";
  import { send } from "$lib/sharing/send";

  let sentAccept = false;

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

  onMount(() => {
    if (!sentAccept) {
      sentAccept = true;

      setup();
      connectAsListener(Number($page.params.did), $page.params.filetransfer_id);
    }
  });

  const returnSubstring = (file_name: string) => {
    let position = file_name.lastIndexOf(".");

    if (position != -1) {
      let end = file_name.slice(position);

      return file_name.slice(0, 25 - end.length) + end;
    }
  };

  $: {
    if ($incoming_filetransfers.length > 0) {
      clearInterval(animationInterval);
    }
  }
</script>

<div id="header">
  <header class="fixed">
    <nav>
      <!-- svelte-ignore a11y-click-events-have-key-events  a11y-no-noninteractive-element-interactions -->
      <p
        style="font-size: large; font-weight: 600;"
        on:click={() => (window.location.href = "/")}
      >
        Fileplay
      </p>
      <div class="max" />
      <Input />
      <button class="circle transparent" on:click={() => closeConnections()}>
        <i>block</i>
        <div class="tooltip bottom">Cancel</div>
      </button>
    </nav>
  </header>
</div>

<div id="main">
  <article class="secondary-container">
    {#if $incoming_filetransfers.length == 0}
      <p class="center-align large-text">{finalString}</p>
    {:else}
      <p class="bold" style="margin: 0;">Incoming files:</p>
    {/if}

    {#each $incoming_filetransfers as filetransfer}
      {#each filetransfer.files as file}
        <div style="margin-bottom: 5px;">
          <div class="no-space row center-align">
            {#if file.url}
              <article
                class="border left-round"
                style="width: 80%; height: 50px; border-right-style: none;"
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
                <progress class="circle small" />
              </article>
            {/if}
          </div>
        </div>
      {/each}
    {/each}
  </article>

  {#if $incoming_filetransfers.length > 0 || true} <!-- debug -->
    <article class="secondary-container">
      {#if $files === undefined || $files.length === 0}
        <button class="center" on:click={() => $input.click()}
          >Send files back</button
        >
      {:else}
        <div class="row">
          <p class="bold" style="margin: 0;">Selected files:</p>
          <div class="max" />
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute a11y-no-static-element-interactions -->
          <a on:click={() => $input.click()} style="color: var(--secondary)"
            >Change</a
          >
        </div>
        <div class="row wrap">
          {#each Array.from($files) as file}
            <article class="square round tertiary">
              <i class="center middle">
                {#if file.type.slice(0, file.type.indexOf("/")) == "audio"}
                  audio_file
                {:else if file.type.slice(0, file.type.indexOf("/")) == "video"}
                  video_file
                {:else if file.type.slice(0, file.type.indexOf("/")) == "image"}
                  image
                {:else}
                  description
                {/if}
              </i>
              <div class="tooltip right">{file.name}</div>
            </article>
          {/each}
        </div>
        <button
          class="center"
          on:click={() => send($files, Number($page.params.did))}>Send</button
        >
      {/if}
    </article>
  {/if}
</div>

<style>
  #main {
    display: flex;
    flex-flow: column;
    gap: 7px;
    padding: 20px;
  }
</style>
