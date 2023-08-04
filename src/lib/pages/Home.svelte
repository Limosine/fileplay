<script lang="ts">
  import { input, files } from "$lib/components/Input.svelte";
  import { writable } from "svelte/store";
  import QRCode from "qrcode";
  import { onMount } from "svelte";
  import {
    getDeviceInfos,
    updateContacts,
    type IContact,
  } from "$lib/lib/fetchers";
  import { current, contacts } from "$lib/lib/UI";
  import { getDicebearUrl } from "$lib/lib/common";
  import { sendState, SendState } from "$lib/lib/sendstate";

  let pending_filetransfers = writable<{
    filetransfer_id: string;
    encrypted: string;
    completed: boolean;
    files: {
        file: string[];
        chunks: number;
        file_name: string;
        file_id: string;
    }[];
    cid?: string;
  }[]>([]);
  let link = writable("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let addPendingFile = (files: FileList) => {};
  let send: (
    files: FileList,
    cid?: string,
    peerID?: string,
    publicKey?: string
  ) => Promise<string | undefined>;

  let qrCode: string;
  const generateQRCode = async (link: string) => {
    try {
      qrCode = await QRCode.toDataURL(link);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  function setSendState(cid: number, state: SendState) {
    $sendState[cid] = state;
    if (
      [SendState.FAILED, SendState.REJECTED, SendState.CANCELED].includes(state)
    ) {
      setTimeout(() => ($sendState[cid] = SendState.IDLE), 1000);
    }
  }

  async function handleContactClick(contact: IContact) {
    switch ($sendState[contact.cid]) {
    case SendState.REQUESTING:
      // cancel sharing request
      setSendState(contact.cid, SendState.CANCELED);
      break;
    case SendState.SENDING:
      // cancel sharing in progress
      setSendState(contact.cid, SendState.CANCELED);
      break;
    default: // IDLE, CANCELED, FAILED, REJECTED
      let devices = (await getDeviceInfos() as any).filter(
        (item: any) => item.cid == contact.cid
      );

      devices.forEach((device: any) => {
        send(
          $files,
          contact.cid.toString(),
          device.peerJsId,
          device.encryptionPublicKey
        );
      });

      setSendState(contact.cid, SendState.SENDING);

      break;
    }
  }

  let progress = writable<{ [cid: string]: string }>({});
  let progress_styles = writable<{ [cid: string]: { class: string, indeterminate: boolean }}>({});
  $: {
    if (Object.keys($sendState).length != 0) {
      for (let [key, value] of Object.entries($sendState)) {
        switch(value) {
        case SendState.REQUESTING:
          $progress_styles[key] = {
            class: "progress-yellow",
            indeterminate: true,
          };
          break;
        case SendState.IDLE:
          $progress_styles[key] = {
            class: "",
            indeterminate: false,
          };
          break;
        case SendState.SENDING:
          $progress_styles[key] = {
            class: "",
            indeterminate: false,
          };
          break;
        case SendState.SENT:
          $progress_styles[key] = {
            class: "progress-green",
            indeterminate: false,
          };
          break;
        default:
          $progress_styles[key] = {
            class: "progress-red",
            indeterminate: false,
          };
          break;
        }
      }
    }
  }
  $: {
    if ($pending_filetransfers.length != 0) {
      $pending_filetransfers.forEach((pending_filetransfer) => {
        if (pending_filetransfer.cid !== undefined) {
          let sent = 0;
          let total = 0;

          pending_filetransfer.files.forEach((file) => {
            sent = sent + file.chunks;
            total = total + file.file.length;
          });

          const progress_number = sent / total;

          if (progress_number < 0.25) {
            $progress[pending_filetransfer.cid] = "var(--surface)";
          } else if (progress_number < 0.5) {
            $progress[pending_filetransfer.cid] = "var(--surface) var(--primary) var(--surface) var(--surface)";
          } else if (progress_number < 0.75) {
            $progress[pending_filetransfer.cid] = "var(--surface) var(--primary) var(--primary) var(--surface)";
          } else if (progress_number < 1) {
            $progress[pending_filetransfer.cid] = "var(--surface) var(--primary) var(--primary) var(--primary)";
          } else {
            $progress[pending_filetransfer.cid] = "var(--primary)";
          }
        }
      });
    }
  }

  onMount(async () => {
    addPendingFile = (await import("$lib/peerjs/main")).addPendingFile;
    pending_filetransfers = (await import("$lib/peerjs/common")).pending_filetransfers;
    send = (await import("$lib/peerjs/send")).send;

    link = (await import("$lib/peerjs/common")).link;
  });

  $: {
    if ($link) {
      generateQRCode($link);
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
    <article style="padding: 15px 12px 15px 12px;">
      <div class="row">
        <p class="bold" style="margin: 0;">Selected files:</p>
        <div class="max" />
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute -->
        <a on:click={() => $input.click()} style="color: var(--secondary)"
          >Change</a
        >
      </div>
      <div class="row wrap">
        {#each Array.from($files) as file}
          <article class="square round fill secondary">
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
    </article>
    <article style="padding: 15px 12px 15px 12px; margin: 0;">
      <details>
        <summary class="none">
          <div class="row">
            <p class="bold" style="margin: 0;">Share via link?</p>
            <div class="max" />
            <i>arrow_drop_down</i>
          </div>
        </summary>
        {#if !$link}
          <p>
            <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
            <a
              on:click={() => addPendingFile($files)}
              style="color: var(--secondary)">Generate a QR-Code</a
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
    <article style="padding: 15px 12px 15px 12px; margin: 0;">
      <div class="row">
        <p class="bold" style="margin: 0;">Available contacts:</p>
        <div class="max" />
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute -->
        <a on:click={() => getDeviceInfos()} style="color: var(--secondary)"
          >Refresh</a
        >
      </div>
      <div class="row wrap">
        {#await $contacts}
          <p class="center">Contacts are loading...</p>
        {:then contacts}
          {#if contacts.length == 0}
            <p class="center padding">
              No contacts. Add a new contact on the
              <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
              <a
                on:click={() => {
                  updateContacts();
                  $current = "Contacts";
                }}
                style="color: var(--primary)">contact page</a
              >.
            </p>
          {/if}
          {#each contacts as contact}
            <button
              class="border small-round"
              style="border-color: {($progress[contact.cid] !== undefined) ? $progress[contact.cid] : "var(--primary)"};"
              on:click={() => handleContactClick(contact)}
            >
              <img
                class="responsive"
                src={getDicebearUrl(contact.avatarSeed, 40, 0)}
                alt="{contact.displayName}'s avatar"
              />
              <span>{contact.displayName}</span>
            </button>
          {/each}
        {:catch}
          <p>Failed to load contacts.</p>
        {/await}
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
    padding: 7px;
  }

  #link {
    display: flex;
    flex-flow: row;
    gap: 30px;
    padding-top: 10px;
  }
</style>
