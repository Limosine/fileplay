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
  import { finishedTransfers, receivedChunks } from "$lib/stores/ReceivedFiles";

  // let info = transferHandler.getInformation();
  // const refreshTimer = setInterval(() => {
  //   info = transferHandler.getInformation();
  // }, 10);

  let sender_uuid: Writable<string>;

  let send: (files: FileList, peerID?: string, publicKey?: string) => {};
  let addPendingFile: (files: FileList) => {};

  let currentChunks = 0;
  let totalChunks = 0;

  $: {
    $receivedChunks.forEach((value) => {
      if (value.chunks.length < value.chunkNumber) {
        totalChunks = value.chunkNumber;
        if (!$finishedTransfers.includes(value.fileID)) {
          currentChunks = value.chunks.length;
          return;
        } else currentChunks = totalChunks;
      }
    });
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!e?.dataTransfer?.files) {
      return;
    }
    $files = e.dataTransfer.files;
  };

  let received_files = writable<{ url: string; name: string }[]>([]);

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
    sender_uuid = (await import("$lib/peerjs")).sender_uuid;

    const { setup } = await import("$lib/peerjs");
    received_files = (await import("$lib/peerjs")).received_files;
    send = (await import("$lib/peerjs")).send;
    addPendingFile = (await import("$lib/peerjs")).addPendingFile;

    link = (await import("$lib/peerjs")).link;
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

  {#if $files}
    <Card padded>
      <h6>Selected file(s):</h6>
      <p class="small"><br /></p>

      {#each Array.from($files) as file}
        <p>{file.name}</p>
      {/each}
    </Card>
  {/if}

  {#if $received_files.length != 0 && $received_files.at(-1)}
    <Card padded>
      <h6>Received file(s):</h6>
      <p class="small"><br /></p>

      {#each $received_files as received_file}
        <a href={received_file.url} download={received_file.name}
          >{received_file.name}</a
        ><br />
      {/each}
      {#if $receivedChunks.length > 0 && $finishedTransfers.length != $receivedChunks.length}
        <h6>
          Progress: {currentChunks} / {totalChunks}
        </h6>
        <h6>{$received_files.length} / {$receivedChunks.length}</h6>
      {/if}
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
