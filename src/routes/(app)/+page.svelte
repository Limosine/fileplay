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

  import {
    settings_open,
    active,
    drawer,
    drawer_open,
  } from "$lib/stores/Dialogs";
  import { updateContacts, getDevices, getDeviceInfos } from "$lib/personal";
  import LinearProgress from "@smui/linear-progress/src/LinearProgress.svelte";
  import QRCode from "qrcode";
  import Button, { Group } from "@smui/button";
  import Tooltip, { Wrapper } from "@smui/tooltip";

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
      };
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
</script>

<svelte:head>
  <title>Fileplay</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />

<SelectContactsDialog />
<AddContactDialog />
<SettingsDialog />

<SetupDialog />

<div class="center">
  <div class="beside">
    <!-- <div style="display: flex; justify-content: center"> -->
    <!-- </div> -->

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
  }
</style>
