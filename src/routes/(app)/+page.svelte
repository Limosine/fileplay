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
  import { transferHandler } from "$lib/stores/ReceivedFiles";
  import Textfield from "@smui/textfield";

  let info = transferHandler.getInformation();
  const refreshTimer = setInterval(() => {
    info = transferHandler.getInformation();
  }, 10);

  let sender_uuid: Writable<string>;

  let send: (files: FileList, peerID?: string, publicKey?: string ) => {}
  let addPendingFile: (files: FileList) => {};

  let peerID = "";

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

    await pgp_setup();
    const peerjs_setup = setup();

    messages.onnotificationclick("share_accept", async (data: any) => {
      await peerjs_setup;
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
    console.log("registered share accept notification click handler");
    await messages.init();
  });
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
      <Textfield
        label="PeerID"
        bind:value={peerID}
      />
      <Card>
        <PrimaryAction
          on:click={() => send($files, peerID)}
          style="padding: 64px"
        >
          <Icon class="material-icons" style="font-size: 30px">send</Icon>
          Send file(s)
        </PrimaryAction>
      </Card>
      <Card>
        <PrimaryAction
          on:click={() => addPendingFile($files)}
          style="padding: 64px"
        >
          <Icon class="material-icons" style="font-size: 30px">send</Icon>
          Via link
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

  <!-- {#if $received_files.length != 0}
    <Card padded>
      <h6>Received file(s):</h6>
      <p class="small"><br /></p>

      {#each $received_files as received_file}
        <a href={received_file.url} download={received_file.name}
          >{received_file.name}</a
        ><br />
      {/each}
    </Card>
  {/if} -->

  {#if $received_files.length != 0 && $received_files.at(-1)}
    <Card padded>
      <h6>Received file(s):</h6>
      <p class="small"><br /></p>

      {#each $received_files as received_file}
        <a href={received_file.url} download={received_file.name}
          >{received_file.name}</a
        ><br />
      {/each}
      {#if info.totalFiles > 0}
        <h6>Progress: {info.currentChunks} / 10</h6>
        <h6>{info.currentFiles} / {info.totalFiles}</h6>
      {/if}
    </Card>
  {:else if info.totalFiles > 0}
    <Card padded>
      <h6>Progress: {info.currentChunks} / 10</h6>
      <h6>{info.currentFiles} / {info.totalFiles}</h6>
    </Card>{/if}
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
