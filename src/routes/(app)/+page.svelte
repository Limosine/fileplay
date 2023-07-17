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
  } from "$lib/stores/Dialogs";
  import { updateContacts, getDevices, getDeviceInfos } from "$lib/personal";
  import QRCode from "qrcode";
  import { status as current_status} from "$lib/websocket";

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
      if ($select_open) {
        updateContacts();
        getDeviceInfos();
      }
      if ($settings_open && $active == "Devices") getDevices();
      if ($drawer_open && $drawer == "Contact") updateContacts();
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
</script>

<svelte:head>
  <title>Fileplay</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />

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
      <div class="s">
        <img class="circle" src="/favicon.png" alt="Fileplay" />
        <div class="tooltip bottom">Fileplay</div>
      </div>
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
      <button on:click={() => sendNotification("Hi!")} class="s extra">
        <i>share</i>
        <span>Share</span>
      </button>
    {/if}
  </div>

  <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
  <nav class="s bottom bar" style="position: relative;">
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

<!-- <div class="center">
  <div class="beside">
    <div style="display: flex; justify-content: center" />

    <Card>
      <PrimaryAction on:click={() => $input.click()} style="padding: 64px">
        <Icon class="material-icons" style="font-size: 30px">upload</Icon>
        Select file(s)
      </PrimaryAction>
    </Card>

    {#if $files}
      <Card>
        <PrimaryAction
          on:click={() => select_open.set(true)}
          style="padding: 64px"
        >
          <Icon class="material-icons" style="font-size: 30px">send</Icon>
          Send file(s)
        </PrimaryAction>
      </Card>
    {/if}
  </div>

  {#if $link}
    <Card class="card">
      <div class="link">
        {#if qrCode}
          <img src={qrCode} alt="QR Code" />
        {/if}

        <div>
          <h6>Link</h6>
          <br />
          <Group variant="unelevated">
            <Wrapper>
              <Button
                variant="outlined"
                class="material-icons"
                on:click={() => navigator.clipboard.writeText($link)}
                >content_copy</Button
              >
              <Tooltip>Copy link</Tooltip>
            </Wrapper>
            <Wrapper>
              <Button
                variant="outlined"
                class="material-icons"
                on:click={() =>
                  navigator.share({
                    url: $link,
                  })}>share</Button
              >
              <Tooltip>Share link</Tooltip>
            </Wrapper>
          </Group>
        </div>
      </div>
    </Card>
  {/if}

  {#if $files}
    <Card padded>
      <h6>Selected file(s):</h6>
      <p class="small"><br /></p>

      {#each Array.from($files) as file}
        <p>{file.name}</p>
      {/each}
    </Card>
  {/if}

  {#if $received_chunks.length != 0 && $received_chunks.at(-1)}
    <Card padded>
      <h6>Received file(s):</h6>
      <p class="small"><br /></p>

      {#each $received_chunks as received_file_chunks}
        <div style="margin-bottom: 5px;">
          <LinearProgress
            style="text-align: left"
            progress={received_file_chunks.chunks.length /
              received_file_chunks.chunk_number}
            closed={!!received_file_chunks.url}
          />
          <Card padded>
            {#if received_file_chunks.url}
              <a
                href={received_file_chunks.url}
                download={received_file_chunks.file_name}
              >
                {received_file_chunks.file_name}
              </a>
            {:else}
              {received_file_chunks.file_name}
            {/if}
          </Card>
        </div>
      {/each}
    </Card>
  {/if}
</div> -->

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

    display: flex;
    justify-content: center;
    align-items: center;
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
