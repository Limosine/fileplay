<script lang="ts">
  import Input, { input, files } from "$lib/components/Input.svelte";
  import { onDestroy, onMount } from "svelte";
  import { writable, type Writable } from "svelte/store";

  import { open as select_open } from "$lib/stores/SelectContactStore";

  import { setup as pgp_setup } from "$lib/openpgp";
  import { current, openDialog, ValueToName } from "$lib/UI";

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

      console.log(qrCode);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  };

  let sender_uuid: Writable<string>;

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
  <div class="centered">
    <button on:click={() => sendNotification("Hi!")} class="extra">
      <i>share</i>
      <span>Share</span>
    </button>
  </div>
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
              <div class="tooltip bottom">Delete contact</div>
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/await}
{:else if $current == "Settings" && $user_loaded}
  <Edit />

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
      on:click={() => openDialog("username", "Username")}
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
      on:click={() => openDialog("avatar", "Avatar")}
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
      on:click={() => openDialog("deviceType", "Device type")}
    >
      <div class="column">
        <p style="font-size: large; margin-bottom: 2px;">Devices</p>
        <p style="font-size: small; margin-top: 0;">Manage devices</p>
      </div>
    </a>
  {:catch}
    <p>Failed to load user infos.</p>
  {/await}
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
