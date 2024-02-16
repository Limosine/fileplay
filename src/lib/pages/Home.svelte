<script lang="ts">
  import { writable } from "svelte/store";

  import { getDicebearUrl } from "$lib/lib/common";
  import { type IContact } from "$lib/lib/fetchers";
  import { sendState, SendState } from "$lib/lib/sendstate";
  import {
    current,
    contacts,
    generateQRCode,
    contactId,
    deviceId,
    input,
    files,
  } from "$lib/lib/UI";
  import {
    link,
    outgoing_filetransfers,
    type OutgoingFileTransfer,
  } from "$lib/sharing/common";
  import { addPendingFile } from "$lib/sharing/main";
  import { send } from "$lib/sharing/send";

  let qrCode: string;
  const setQRCode = async (link: string ) => {
    qrCode = await generateQRCode(link);
  };

  const handleContactClick = async (contact: IContact) => {
    const state = $sendState[contact.cid];
    const devices = contact.devices;

    if (
      state == SendState.CHUNKING ||
      state == SendState.REQUESTING ||
      state == SendState.SENDING
    ) {
      $contactId = contact.cid;
      ui("#dialog-send");
    } else {
      $contactId = contact.cid;
      ui("#dialog-send");
      for (const device of devices) {
        $deviceId = device.did;
        await send(device.did, contact.cid, undefined);
      }
    }
  };

  const updateOutgoingProgress = (
    transfers: OutgoingFileTransfer[],
    state: typeof $sendState,
  ) => {
    if (transfers.length != 0) {
      transfers.forEach((transfer) => {
        if (transfer.cid !== undefined && transfer.files !== undefined) {
          let total = 0;
          let sent = 0;

          transfer.files.forEach((file) => {
            total = total + file.small.chunks_length;
            if (file.completed !== 0) sent = sent + file.small.chunks_length;
          });

          const progress_number = sent / total;

          const sendState = state[transfer.cid];

          if (state == SendState.SENDING) {
            if (progress_number < 0.25) {
              $progress[transfer.cid] = "var(--surface)";
            } else if (progress_number < 0.5) {
              $progress[transfer.cid] =
                "var(--surface) var(--primary) var(--surface) var(--surface)";
            } else if (progress_number < 0.75) {
              $progress[transfer.cid] =
                "var(--surface) var(--primary) var(--primary) var(--surface)";
            } else if (progress_number < 1) {
              $progress[transfer.cid] =
                "var(--surface) var(--primary) var(--primary) var(--primary)";
            } else {
              $progress[transfer.cid] = "var(--primary)";
            }
          } else if (state == SendState.REQUESTING) {
            $progress[transfer.cid] = "#fff700";
          } else if (state == SendState.FAILED) {
            $progress[transfer.cid] = "#93000a";
          } else {
            $progress[transfer.cid] = "var(--primary)";
          }
        }
      });
    }
  };

  let progress = writable<{ [cid: string]: string }>({});
  $: {
    updateOutgoingProgress($outgoing_filetransfers, $sendState);
  }

  $: {
    if ($files.length > 0 && $link) {
      setQRCode($link);
    }
  }
</script>

{#if $files === undefined || $files.length == 0}
  <div class="centered">
    <button on:click={() => $input.click()} class="extra">
      <i>share</i>
      <span>Share</span>
    </button>
  </div>
{:else}
  <div id="home">
    <article style="padding: 15px 12px 15px 12px;" class="secondary-container">
      <div class="row">
        <p class="bold">Selected files:</p>
        <div class="max" />
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute a11y-no-static-element-interactions -->
        <a on:click={() => { qrCode = ""; $input.click(); }} style="color: var(--secondary)"
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
    </article>
    <article
      style="padding: 15px 12px 15px 12px; margin: 0;"
      class="secondary-container"
    >
      <details>
        <summary class="none">
          <div class="row">
            <p class="bold">Share via link?</p>
            <div class="max" />
            <i>arrow_drop_down</i>
          </div>
        </summary>
        {#if !$link}
          <p>
            <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <a on:click={() => addPendingFile()} style="color: var(--secondary)"
              >Generate a QR-Code</a
            >, which can be used to download files without needing to register.
          </p>
        {:else}
          <div id="link" class="center-align">
            {#if qrCode}
              <img style="border-radius: 0.75rem" src={qrCode} alt="QR Code" />
            {/if}
            <div>
              <p class="center-align" style="font-size: 150%">Link</p>
              <br />
              <nav class="no-space center-align">
                <button
                  on:click={() => navigator.clipboard.writeText($link)}
                  class="border left-round"
                >
                  <i>content_copy</i>
                  <div class="tooltip bottom">Copy link</div>
                </button>
                <button
                  on:click={() =>
                    navigator.share({
                      url: $link,
                    })}
                  class="border right-round"
                >
                  <i>share</i>
                  <div class="tooltip bottom">Share link</div>
                </button>
              </nav>
            </div>
          </div>
        {/if}
      </details>
    </article>
    <article
      style="padding: 15px 12px 15px 12px; margin: 0;"
      class="secondary-container"
    >
      <div class="row">
        <p class="bold">Available contacts:</p>
        <div class="max" />
      </div>
      {#if $contacts.length <= 0 || $contacts.find((contact) => contact.devices.length > 0) === undefined}
        <p class="center padding">
          No contact available. Add a new contact on the
          <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <a
            on:click={() => ($current = "Contacts")}
            style="color: var(--primary)">contact page</a
          >.
        </p>
      {/if}
      <div class="row wrap">
        {#each $contacts as contact}
          {#if contact.devices.length > 0}
            <button
              class="border small-round"
              style="border-color: {$progress[contact.cid] !== undefined
                ? $progress[contact.cid]
                : 'var(--primary)'};"
              on:click={() => handleContactClick(contact)}
            >
              <img
                class="responsive"
                src={getDicebearUrl(contact.avatar_seed, 40, 0)}
                alt="{contact.display_name}'s avatar"
              />
              <span>{contact.display_name}</span>
            </button>
          {/if}
        {/each}
      </div>
    </article>
  </div>
{/if}

<style>
  .centered {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #home {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 20px;
  }

  #link {
    display: flex;
    flex-flow: row;
    gap: 30px;
    padding-top: 10px;
  }
</style>
