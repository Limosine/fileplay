<script lang="ts">
  import Input, { input, files } from "$lib/components/Input.svelte";
  import { onDestroy, onMount } from "svelte";
  import { writable, type Writable } from "svelte/store";

  import { open as select_open } from "$lib/stores/SelectContactStore";

  import { setup as pgp_setup } from "$lib/openpgp";

  import {
    settings_open,
    active,
    drawer,
    drawer_open,
    notifications,
    deleteNotification,
    type INotification,
  } from "$lib/stores/Dialogs";
  import {
    contacts,
    updateContacts,
    getDevices,
    getDeviceInfos,
  } from "$lib/personal";
  import QRCode from "qrcode";
  import { status as current_status } from "$lib/websocket";
  import { getDicebearUrl } from "$lib/common";

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
      if (current == "Contacts" || $select_open) {
        updateContacts();
        if ($select_open) getDeviceInfos();
      }
      if (current == "Settings" && $active == "Devices") getDevices();
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(refresh_interval);
  }

  onDestroy(stopRefresh);

  onMount(async () => {
    // startRefresh();
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

  let current = "Home";

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

  // topbar
  const colors = ["yellow", "green", "red"];
  const status = ["Connecting", "Online", "Error"];

  // contacts
  async function deleteContact(cid: number) {
    await fetch(`/api/contacts?cid=${cid}`, {
      method: "DELETE",
    });
    await updateContacts();
  }

  // notifications
  async function handleNotificationClick(n: INotification, action: string) {
    deleteNotification(n.tag);
    if (action == "close") return null;
  }
</script>

<svelte:head>
  <title>Fileplay</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />

<dialog class="right" id="dialog-notifications">
  <nav>
    <!-- svelte-ignore missing-declaration -->
    <button
      on:click={() => ui("#dialog-notifications")}
      class="transparent circle large"
    >
      <i>close</i>
    </button>
    <h5 class="max">Notifications</h5>
  </nav>
  <div class="section-contacts">
    {#each $notifications as n}
        <article class="border">
          <div class="row">
            <h6>{n.title}</h6>
            <p>{n.body}</p>
            <nav>
              {#each n.actions ?? [] as action}
                <button on:click={() => handleNotificationClick(n, action.action)}>{action.title}</button>
              {/each}
              <button on:click={() => deleteNotification(n.tag)}>Close</button>
            </nav>
          </div>
        </article>
    {/each}
  </div>
</dialog>

<div class="box">
  <header class="layout fill fixed">
    <nav>
      <p class="s bold large-text">{current}</p>
      <div class="max" />
      <div>
        <div
          class="connection-status"
          style="background-color: {colors[$current_status]}"
        />
        <div class="tooltip bottom">{status[$current_status]}</div>
      </div>
      <!-- svelte-ignore missing-declaration -->
      <button
        class="s circle transparent"
        on:click={() => ui("#dialog-notifications")}
      >
        <i>notifications</i>
        <div class="tooltip bottom">Notifications</div>
      </button>
      <button class="l m circle transparent">
        <i>settings</i>
        <div class="tooltip bottom">Settings</div>
      </button>
    </nav>
  </header>

  <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
  <nav class="m l left">
    <a>
      <img class="circle" src="/favicon.png" />
    </a>
    <a>
      <i>contacts</i>
      <span>Contacts</span>
    </a>
    <a>
      <i>notifications</i>
      <span>Notifications</span>
    </a>
  </nav>

  <div class="section">
    {#if current == "Home"}
      <div class="section-center">
        <button on:click={() => sendNotification("Hi!")} class="s extra">
          <i>share</i>
          <span>Share</span>
        </button>
      </div>
    {:else if current == "Contacts"}
      {#await $contacts}
        <p>Contacts are loading...</p>
      {:then contacts_}
        {#each contacts_ as contact}
          <div class="section-contacts">
            <article>
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
          </div>
        {/each}
      {/await}
    {/if}
  </div>

  <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
  <nav
    class="s bottom bar"
    style={current == "Home" ? "position: relative;" : ""}
  >
    <a
      class={current == "Home" ? "active" : ""}
      on:click={() => (current = "Home")}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={current == "Contacts" ? "active" : ""}
      on:click={() => (current = "Contacts")}
    >
      <i>Contacts</i>
      <span>Contacts</span>
    </a>
    <a
      class={current == "Settings" ? "active" : ""}
      on:click={() => (current = "Settings")}
    >
      <i>settings</i>
      <span>Settings</span>
    </a>
  </nav>
</div>

<style>
  .box {
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .box > header,
  .box > .bar {
    flex: 0 1 auto;
  }

  .box > .section {
    flex: 1 1 auto;
  }

  .box > .section > .section-center {
    display: flex;
    height: 100%;
    justify-content: center;
    align-items: center;
  }

  .box > .section > .section-contacts {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 7px;
  }

  .connection-status {
    margin: 10px;
    border-radius: 50%;
    border: 3px solid #cac4d0;
    height: 20px;
    width: 20px;
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
  .center {
    display: flex;
    flex-direction: column;
    gap: 10px;
    justify-content: center;
    align-items: center;
    text-align: center;
    min-height: 100vh;
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
