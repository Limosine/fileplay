<script lang="ts">
  import { Icon } from "@smui/common";
  import Card, { PrimaryAction } from "@smui/card";
  import Input, { input, files } from "$lib/components/Input.svelte";
  import SetupDialog from "$lib/dialogs/SetupDialog.svelte";
  import { onDestroy, onMount } from "svelte";
  import { writable } from "svelte/store";

  import SelectContactsDialog from "$lib/dialogs/SelectContactsDialog.svelte";
  import { open as select_open } from "$lib/stores/SelectContactStore";

  import AddContactDialog from "$lib/dialogs/AddContactDialog.svelte";
  import { setup as pgp_setup } from "$lib/openpgp";

  import SettingsDialog from "$lib/dialogs/SettingsDialog.svelte";

  import {
    settings_open,
    active,
    contacts_drawer_open,
  } from "$lib/stores/Dialogs";
  import { getContacts, getDeviceInfos, getDevices } from "$lib/personal";
  import { default_messages as messages } from "$lib/messages";

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
      if ($select_open) getDeviceInfos();
      if ($settings_open && $active == "Devices") getDevices();
      if ($contacts_drawer_open) getContacts();
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(refresh_interval);
  }

  onMount(async () => {
    startRefresh();
  });

  onDestroy(stopRefresh);

  onMount(async () => {
    const { setup } = await import("$lib/peerjs");
    received_files = (await import("$lib/peerjs")).received_files;

    link = (await import("$lib/peerjs")).link;

    pgp_setup();
    setup("");

    messages.init();
  });
</script>

<svelte:head>
  <title>Fileplay</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<SetupDialog />

<Input />
<SelectContactsDialog />
<AddContactDialog />
<SettingsDialog />

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

  {#if $received_files.length != 0}
    <Card padded>
      <h6>Received file(s):</h6>
      <p class="small"><br /></p>

      {#each $received_files as received_file}
        <a href={received_file.url} download={received_file.name}
          >{received_file.name}</a
        ><br />
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
