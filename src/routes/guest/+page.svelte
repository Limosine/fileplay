<script lang="ts">
  import { page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";

  import "beercss";

  import Input, { click, files } from "$lib/components/Input.svelte";
  import { setup } from "$lib/lib/encryption";
  import { SendState, sendState } from "$lib/lib/sendstate";
  import { peer } from "$lib/lib/simple-peer";
  import { incoming_filetransfers } from "$lib/sharing/common";
  import { cancelFiletransfer, connectAsListener } from "$lib/sharing/main";
  import { send } from "$lib/sharing/send";
  import { handleMessage, setupGuest } from "$lib/lib/fetchers";

  let sentAccept = false;
  let did: number;
  let filetransfer_id: string;
  let sender: boolean;

  const waitingTemplateString = "Waiting for files";
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
    if (!sentAccept) {
      sentAccept = true;
      did = Number($page.url.searchParams.get("did"));
      filetransfer_id = String($page.url.searchParams.get("id"));
      sender = $page.url.searchParams.has("sender");

      navigator.serviceWorker.addEventListener("message", handleMessage);

      await setup();
      await setupGuest();

      if (!sender) connectAsListener(did, filetransfer_id);
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
      <button
        class="circle transparent"
        on:click={() => peer().closeConnections()}
      >
        <i>block</i>
        <div class="tooltip bottom">Cancel</div>
      </button>
    </nav>
  </header>
</div>

<div id="main">
  {#if !sender}
    <article class="secondary-container" style="margin: 0;">
      {#if $incoming_filetransfers.length == 0}
        <p class="center-align large-text">{finalString}</p>
      {:else}
        <div class="row" style="margin-bottom: 12px">
          <p class="bold">Incoming files:</p>
          <div class="max" />
        </div>
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
                    class="large right-round"
                    style="padding: 0px 3px 0px 0px; margin: 0px; height: 50px;"
                  >
                    <i class="large">download</i>
                  </button>
                </a>
              {:else}
                <article
                  class="border round row"
                  style="width: 80%; height: 50px;"
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
  {/if}

  {#if $incoming_filetransfers.length > 0 || sender}
    <article class="secondary-container" style="margin: 0;">
      {#if $files === undefined || $files.length === 0}
        <button class="center" on:click={() => click("click")}
          >Send files{sender ? "" : " back"}</button
        >
      {:else}
        <div class="row">
          <p class="bold">Selected files:</p>
          <div class="max" />
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute a11y-no-static-element-interactions -->
          <a on:click={() => click("click")} style="color: var(--secondary)"
            >Change</a
          >
        </div>
        <div class="row wrap">
          {#each Array.from($files) as file}
            <article class="square round tertiary">
              <i class="center middle">
                {#if file.file.type.slice(0, file.file.type.indexOf("/")) == "audio"}
                  audio_file
                {:else if file.file.type.slice(0, file.file.type.indexOf("/")) == "video"}
                  video_file
                {:else if file.file.type.slice(0, file.file.type.indexOf("/")) == "image"}
                  image
                {:else}
                  description
                {/if}
              </i>
              <div class="tooltip right">{file.file.name}</div>
            </article>
          {/each}
        </div>
        {#if $sendState[0] === undefined || $sendState[0] === SendState.IDLE || $sendState[0] === SendState.CANCELED}
          <button
            class="center"
            style="margin-top: 7px;"
            on:click={() => send(did, 0, undefined)}>Send</button
          >
        {:else}
          <div class="row" style="margin-top: 7px;">
            <div class="center">
              <button on:click={() => cancelFiletransfer()}>{$sendState}</button
              >
              <button
                class="circle tertiary"
                on:click={() => {
                  cancelFiletransfer();
                  send(did, 0, undefined);
                }}
              >
                <i>refresh</i>
              </button>
            </div>
          </div>
        {/if}
      {/if}
    </article>
  {/if}
</div>

<style>
  #main {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 20px;
  }
</style>
