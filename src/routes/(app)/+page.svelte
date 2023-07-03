<script lang="ts">
  import { Icon } from "@smui/common";
  import Card, { PrimaryAction } from "@smui/card";
  import Input, { input, files } from "$lib/components/Input.svelte";
  import SetupDialog from "$lib/dialogs/SetupDialog.svelte";
  import { onDestroy, onMount } from "svelte";
  import { writable, type Writable } from "svelte/store";

  import SelectContactsDialog from "$lib/dialogs/SelectContactsDialog.svelte";
  import { open as select_open } from "$lib/stores/SelectContactStore";

  import AddContactDialog from "$lib/dialogs/AddContactDialog.svelte";
  import { setup as pgp_setup, publicKey_armored } from "$lib/openpgp";

  import SettingsDialog from "$lib/dialogs/SettingsDialog.svelte";
  import NotificationPermission from "$lib/dialogs/NotificationPermission.svelte";

  import {
    settings_open,
    active,
    contacts_drawer_open,
  } from "$lib/stores/Dialogs";
  import { updateContacts, getDevices } from "$lib/personal";
  import { status } from "$lib/messages";
  import LinearProgress from "@smui/linear-progress/src/LinearProgress.svelte";
  import QRCode from "qrcode";

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

  let send: (files: FileList, peerID?: string, publicKey?: string) => {};
  let addPendingFile: (files: FileList) => {};

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
      if ($select_open) updateContacts();
      if ($settings_open && $active == "Devices") getDevices();
      if ($contacts_drawer_open) updateContacts();
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(refresh_interval);
  }

  onDestroy(stopRefresh);

  onMount(async () => {
    startRefresh();
    sender_uuid = (await import("$lib/peerjs/common")).sender_uuid;

    const { setup } = await import("$lib/peerjs/main");
    received_chunks = (await import("$lib/peerjs/common")).received_chunks;
    send = (await import("$lib/peerjs/send")).send;
    addPendingFile = (await import("$lib/peerjs/main")).addPendingFile;

    link = (await import("$lib/peerjs/common")).link;
    const messages = (await import("$lib/messages")).default_messages;

    pgp_setup();
    setup();

    messages.onnotificationclick("share_accept", async (data: any) => {
      await fetch("/api/share/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          peerJsId: $sender_uuid,
          encryptionPublicKey: publicKey_armored,
          sid: data.sid,
        }),
      });
      console.log("share accept notification click handler");
    });
    messages.onnotificationclick("share_reject", async (data: any) => {
      await fetch("/api/share/answer", {
        method: "DELETE",
        body: JSON.stringify({
          sid: data.sid,
        }),
      });
      console.log("share reject notification click handler");
    });
    await messages.init();

    if ("connection" in navigator)
      //@ts-ignore
      navigator.connection.onChange = async () => {
        console.log("connection change");
        await messages.init();
      };
  });

  let init_tries = 0;
  $: {
    // re-init messages if error
    if ($link) {
      generateQRCode($link);
    }
    if ($status === "2" && init_tries < 5) {
      setTimeout(async () => {
        if ($status === "2")
          await (await import("$lib/messages")).default_messages.init();
        init_tries++;
      }, 1000);
    }
  }
</script>

<svelte:head>
  <title>Fileplay</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />

<SelectContactsDialog />
<AddContactDialog />
<SettingsDialog />

<NotificationPermission />
<SetupDialog />

<div class="center">
  <div class="beside">
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
    <Card padded>
      Link:<br />
      <a href={$link}>{$link}</a>
    </Card>
  {/if}
  {#if qrCode}
    <Card padded>
      <img src={qrCode} alt="QR Code" />
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
</div>

<style>
  p.small {
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
    gap: 5px;
    justify-content: center;
    align-items: center;
    text-align: center;
    min-height: 100vh;
  }
</style>
