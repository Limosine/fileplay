<script lang="ts">
  import Input, { input, files } from "$lib/components/Input.svelte";
  import { onDestroy, onMount } from "svelte";
  import { writable, type Writable } from "svelte/store";

  import { open as select_open } from "$lib/stores/SelectContactStore";

  import { setup as pgp_setup } from "$lib/openpgp";
  import { current, openDialog, settings_page, ValueToName } from "$lib/UI";

  import { active, deviceParams, userParams } from "$lib/stores/Dialogs";
  import {
    contacts,
    updateContacts,
    getDevices,
    getDeviceInfos,
    user_loaded,
    user,
  } from "$lib/personal";
  import QRCode from "qrcode";
  import { getDicebearUrl } from "$lib/common";
  import Edit from "$lib/dialogs/Edit.svelte";

  let qrCode: string;
  const generateQRCode = async (link: string) => {
    try {
      qrCode = await QRCode.toDataURL(link);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  let sender_uuid: Writable<string>;
  let addPendingFile = (files: FileList) => {};

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!e?.dataTransfer?.files) {
      return;
    }
    $files = e.dataTransfer.files;
  };

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
  let link = writable("");

  let refresh_interval: any;

  function startRefresh() {
    refresh_interval = setInterval(async () => {
      if ($current == "Contacts" || $select_open) {
        updateContacts();
        if ($select_open) getDeviceInfos();
      }
      if ($current == "Settings" && $active == "Devices") getDevices();
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(refresh_interval);
  }

  onDestroy(stopRefresh);

  onMount(async () => {
    startRefresh();
    sender_uuid = (await import("$lib/peerjs/common")).sender_uuid;

    const { openPeer } = await import("$lib/peerjs/main");
    addPendingFile = (await import("$lib/peerjs/main")).addPendingFile;
    received_chunks = (await import("$lib/peerjs/common")).received_chunks;

    link = (await import("$lib/peerjs/common")).link;

    pgp_setup();
    openPeer();
  });

  $: {
    if ($link) {
      generateQRCode($link);
    }
  }

  async function notificationPermission() {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        return true;
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") return true;
      }
    }
    return false;
  }

  async function sendNotification(text: string) {
    if (await notificationPermission()) {
      const notification = new Notification(text);
    }
  }

  // contacts
  async function deleteContact(cid: number) {
    await fetch(`/api/contacts?cid=${cid}`, {
      method: "DELETE",
    });
    await updateContacts();
  }
</script>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />

{#if $current == "Home"}
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
              >, which can be used to download files without needing to
              register.
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
              <article id="contact" class="border">
                <img
                  alt="{contact.displayName}'s avatar"
                  style="height: 40px;"
                  src={getDicebearUrl(contact.avatarSeed, 40)}
                />
                <p class="middle-align">{contact.displayName}</p>
              </article>
            {/each}
          {:catch}
            <p>Failed to load contacts.</p>
          {/await}
        </div>
      </article>
    </div>
  {/if}
{:else if $current == "Contacts"}
  {#await $contacts}
    <p>Contacts are loading...</p>
  {:then contacts_}
    <div id="contacts">
      {#each contacts_ as contact}
        <article style="margin: 0;">
          <div class="row">
            <img
              class="circle medium"
              src={getDicebearUrl(contact.avatarSeed, 100)}
              alt="Avatar"
            />
            <div class="max">
              <p class="large-text">{contact.displayName}</p>
            </div>
            <button
              class="right transparent circle"
              on:click={() => deleteContact(contact.cid)}
            >
              <i>delete</i>
              <div class="tooltip left">Delete contact</div>
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/await}
{:else if $current == "Settings" && $user_loaded}
  <Edit />

  {#if $settings_page == "main"}
    {#await $user}
      <p>User infos are loading...</p>
    {:then user}
      <p
        class="bold"
        style="color: var(--secondary); margin: 20px 0px 5px 0px; padding: 0px 20px 0px 20px;"
      >
        User
      </p>

      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openDialog("username", "Username", user.displayName)}
      >
        <div class="column">
          <p style="font-size: large; margin-bottom: 2px;">Username</p>
          <p style="font-size: small; margin-top: 0;">
            {user.displayName}
          </p>
        </div>
      </a>

      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => openDialog("avatar", "Avatar", user.avatarSeed)}
      >
        <div class="column">
          <p style="font-size: large; margin-bottom: 2px;">Avatar</p>
          <p style="font-size: small; margin-top: 0;">Choose your Avatar</p>
        </div>
        <span class="max" />
        <img
          class="responsive"
          style="height: auto;"
          src={getDicebearUrl(user.avatarSeed, 150)}
          alt="Avatar"
        />
      </a>

      <p
        class="bold"
        style="color: var(--secondary); margin: 20px 0px 5px 0px; padding: 0px 20px 0px 20px;"
      >
        Devices
      </p>

      <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
      <a
        class="chip border responsive row"
        style="margin: 0; padding: 35px 20px 35px 20px; border: 0; color: var(--on-background);"
        on:click={() => ($settings_page = "devices")}
      >
        <div class="column">
          <p style="font-size: large; margin-bottom: 2px;">Devices</p>
          <p style="font-size: small; margin-top: 0;">Manage devices</p>
        </div>
      </a>
    {:catch}
      <p>Failed to load user infos.</p>
    {/await}
  {:else if $settings_page == "devices"}
    <button
      on:click={() => ($settings_page = "main")}
      class="transparent circle"
      style="margin: 8px;"
    >
      <i>arrow_back</i>
    </button>
    <h3 style="margin-bottom: 30px; padding: 0px 20px 0px 20px;">Devices</h3>
  {/if}
{/if}

<style>
  .centered {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  #contacts {
    display: flex;
    flex-flow: column;
    gap: 7px;
    padding: 7px;
  }

  #contact {
    display: flex;
    flex-flow: row;
    gap: 10px;
    padding: 10px;
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
    gap: 20px;
    padding-top: 10px;
  }

  /* p.small {
    line-height: 0.2;
  }
  .beside {
    display: flex;
    flex-basis: auto;
    flex-flow: row wrap;
    justify-content: center;
    gap: 5px;
  }
  .link {
    display: flex;
    flex-flow: row;
    gap: 30px;
  }
  * :global(.card) {
    padding: 30px;
  } */
</style>
