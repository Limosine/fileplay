<script lang="ts">
  import { page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";

  import "beercss";
  import * as materialSymbols from "beercss/dist/cdn/material-symbols-outlined.woff2";

  import { apiClient } from "$lib/api/client";
  import Input from "$lib/components/Input.svelte";
  import { setup } from "$lib/lib/encryption";
  import { handleMessage } from "$lib/lib/fetchers";
  import { peer } from "$lib/lib/p2p";
  import { files, input, returnSubstring } from "$lib/lib/UI";
  import { manager } from "$lib/sharing/manager.svelte";
  import { capitalizeFirstLetter } from "$lib/lib/utils";

  let sentAccept = false;
  let did: number;
  let filetransfer_id: string;
  let sender: boolean | undefined = $state();

  const waitingTemplateString = "Waiting for files";
  let finalString = $state(waitingTemplateString);
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

  onMount(async () => {
    if (!sentAccept) {
      sentAccept = true;
      did = Number($page.url.searchParams.get("did"));
      filetransfer_id = String($page.url.searchParams.get("id"));
      sender = $page.url.searchParams.has("sender");

      navigator.serviceWorker?.addEventListener("message", handleMessage);

      await setup();
      await apiClient("http").setupGuest();

      if (!sender) manager.requestRequest(did, filetransfer_id);
    }
  });

  onDestroy(() => {
    clearInterval(animationInterval);
  });

  $effect(() => {
    if (manager.incoming.length > 0) {
      clearInterval(animationInterval);
    }
  });
</script>

<svelte:head>
  <link
    rel="preload"
    as="font"
    href={materialSymbols.default}
    type="font/woff2"
    crossorigin="anonymous"
  />
</svelte:head>

<div id="header">
  <header class="fixed">
    <nav>
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
      <p
        style="font-size: large; font-weight: 600;"
        onclick={() => (window.location.href = "/")}
      >
        Fileplay
      </p>
      <div class="max"></div>
      <Input />
      <button
        class="circle transparent"
        onclick={() => {
          manager.cancelIncoming();
          manager.cancelOutgoing();
          peer().closeConnections();
        }}
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
      {#if manager.incoming.length == 0}
        <p class="center-align large-text">{finalString}</p>
      {:else}
        <div class="row" style="margin-bottom: 12px">
          <p class="bold">Incoming files:</p>
          <div class="max"></div>
        </div>
      {/if}

      {#each manager.incoming as filetransfer}
        {#each filetransfer.files as file}
          <div style="margin-bottom: 5px;">
            <div class="no-space row center-align">
              {#if file.url}
                <article
                  class="border left-round"
                  style="width: calc(100% - 51px); height: 50px; border-right-style: none;"
                >
                  <span>{returnSubstring(file.name, 25)}</span>
                </article>
                <a
                  class="button large right-round"
                  style="padding: 0 3px 0 0; margin: 0; height: 50px;"
                  href={file.url}
                  download={file.name}
                >
                  <i class="large">download</i>
                </a>
              {:else}
                <article
                  class="border round row"
                  style="width: 100%; height: 50px;"
                >
                  <span>
                    {returnSubstring(file.name, 25)}
                  </span>
                  <progress
                    class="max"
                    style="color: var(--on-secondary);"
                    value={filetransfer.getProgress(file.id)}
                  ></progress>
                </article>
              {/if}
            </div>
            <div class="tooltip">{file.name}</div>
          </div>
        {/each}
      {/each}
    </article>
  {/if}

  {#if manager.incoming.length > 0 || sender}
    <article class="secondary-container" style="margin: 0;">
      {#if $files === undefined || $files.length === 0}
        <button class="center" onclick={() => $input.click()}
          >Send files{sender ? "" : " back"}</button
        >
      {:else}
        <div class="row">
          <p class="bold">Selected files:</p>
          <div class="max"></div>
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_missing_attribute, a11y_no_static_element_interactions -->
          <a onclick={() => $input.click()} style="color: var(--secondary)"
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
        {@const transfer = manager.outgoing.find(
          (t) =>
            t.ids.type == "fromGuest" &&
            t.ids.id === did &&
            t.recipients.some((r) => r.did === did),
        )}
        {#if !transfer}
          <button
            class="center"
            style="margin-top: 7px;"
            onclick={() => {
              const previous = $page.url.searchParams.get("id");
              if (previous !== null)
                manager.createTransfer({
                  type: "fromGuest",
                  id: did,
                  previous,
                });
            }}>Send</button
          >
        {:else}
          {@const state = transfer.recipients.find((r) => r.did === did)?.state}
          <div class="row" style="margin-top: 7px;">
            <div class="center">
              {#if state !== undefined}
                <button onclick={() => manager.cancelOutgoing()}
                  >{capitalizeFirstLetter(state)}</button
                >
              {/if}
              <button
                class="circle tertiary"
                onclick={() => {
                  manager.cancelOutgoing();
                  const previous = $page.url.searchParams.get("id");
                  if (previous !== null)
                    manager.createTransfer({
                      type: "fromGuest",
                      id: did,
                      previous,
                    });
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
