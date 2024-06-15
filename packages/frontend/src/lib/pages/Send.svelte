<script lang="ts">
  import ui from "beercss";

  import {
    input,
    files,
    openDialog,
    contacts,
    groups,
    devices,
    groupDevices,
  } from "$lib/lib/UI";
  import { capitalizeFirstLetter } from "$lib/lib/utils";
  import type {
    OutgoingFileInfos,
    OutgoingFileTransfer,
  } from "$lib/sharing/common";
  import { manager } from "$lib/sharing/manager.svelte";

  const getScope = (ids: OutgoingFileTransfer["ids"]) => {
    if (ids.type == "contact") {
      const contact = $contacts.find((c) => c.uid === ids.id);
      return `Contact "${contact ? contact.display_name : ""}"`;
    } else if (ids.type == "group") {
      const group = $groups.find((g) => g.gid === ids.id);
      return `Group "${group ? group.name : ""}"`;
    } else if (ids.type == "devices") {
      return "Devices";
    } else return "Guest";
  };

  const getName = (did: number, ids: OutgoingFileTransfer["ids"]) => {
    if (ids.type == "contact") {
      const device = $contacts
        .find((c) => c.uid === ids.id)
        ?.devices.find((d) => d.did === did);
      return device === undefined ? "" : device.display_name;
    } else if (ids.type == "devices") {
      const device = $devices.others.find((d) => d.did === did);
      return device === undefined ? "" : device.display_name;
    } else if (ids.type == "group") {
      const device = $groupDevices.find(
        (d) => d.gid === ids.id && d.did === did,
      );
      return device === undefined ? "" : device.display_name;
    } else return `Guest-ID ${did}`;
  };

  const calculateProgress = (filesSent: number, files: OutgoingFileInfos[]) => {
    let sent_chunks = 0;
    let total_chunks = 0;

    for (let i = 0; i < files.length; i++) {
      total_chunks = total_chunks + files[i].bigChunks.length;

      if (i < filesSent) sent_chunks = sent_chunks + files[i].bigChunks.length;
    }

    return total_chunks === 0 ? 0 : sent_chunks / total_chunks;
  };
</script>

{#if $files === undefined || $files.length == 0}
  <div class="centered">
    <button onclick={() => $input.click()} class="extra">
      <i>share</i>
      <span>Share</span>
    </button>
  </div>
{:else}
  <div id="send">
    <article class="secondary-container">
      <div class="row">
        <p class="bold">Selected files:</p>
        <div class="max"></div>
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_missing_attribute, a11y_no_static_element_interactions -->
        <a onclick={() => $input.click()} style="color: var(--secondary)"
          >Change</a
        >
      </div>
      <div class="row wrap" style="margin-top: 16px;">
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
    </article>

    <div style="display: flex; height: 78px;">
      <div style="flex: 50%;">
        <button
          class="responsive large secondary-container"
          style="margin: 0 5px 0 0;"
          onclick={() => ui("#dialog-large")}
        >
          <i>send</i>
          <span>Select recipients</span>
        </button>
      </div>

      <div style="flex: 50%;">
        <button
          class="responsive large secondary-container"
          style="margin: 0 0 0 5px;"
          onclick={() => openDialog({ mode: "qrcode" })}
        >
          <i>qr_code_2_add</i>
          <span>Create Guest Transfer</span>
        </button>
      </div>
    </div>

    {#each manager.outgoing.filter( (t) => t.recipients.some((r) => r.state != "canceled"), ) as transfer, index}
      {#if index === 0}
        <p class="bold" style="color: var(--secondary);">
          Outgoing filetransfers:
        </p>
      {/if}

      <article class="secondary-container">
        <div class="row">
          <p class="large-text">
            Scope: {getScope(transfer.ids)}
          </p>

          <div class="max"></div>

          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_missing_attribute, a11y_no_static_element_interactions -->
          <a
            onclick={() => manager.cancelOutgoing(transfer.id)}
            class="clickable"
          >
            <p>Cancel</p>
          </a>
        </div>

        <div id="transfers">
          {#each transfer.recipients as recipient}
            {#if recipient.state != "canceled"}
              <article
                class="tertiary"
                style="padding-top: 8px; padding-bottom: 8px;"
              >
                <div class="row" style="gap: 5px;">
                  <p>{getName(recipient.did, transfer.ids)}:</p>
                  <p class="bold">{capitalizeFirstLetter(recipient.state)}</p>
                  <div class="max"></div>
                  <button
                    class="transparent circle"
                    onclick={() =>
                      transfer.handleFileTransferFinished(
                        recipient.did,
                        "canceled",
                      )}
                  >
                    <i>close</i>
                  </button>
                </div>
                {#if recipient.state == "sending"}
                  {@const progress = calculateProgress(
                    recipient.filesSent,
                    transfer.files,
                  )}
                  <div class="row">
                    <progress
                      style="background-color: var(--outline); color: var(--on-tertiary);"
                      value={progress}
                    ></progress>
                    <p>
                      {Math.round(progress * 100)}%
                    </p>
                  </div>
                {/if}
              </article>
            {/if}
          {/each}
        </div>
      </article>
    {/each}
  </div>
{/if}

<style>
  p,
  article,
  .row {
    margin: 0;
  }

  article {
    padding: 15px 12px;
  }

  .centered {
    height: 100%;
    display: flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
  }

  #send {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 20px;
  }

  #transfers {
    display: flex;
    flex-flow: column;
    gap: 10px;
    margin-top: 10px;
  }

  button.responsive {
    height: 100%;
    border-radius: 0.75rem;
  }

  .clickable {
    color: var(--primary);
    font-weight: bold;
  }
</style>
