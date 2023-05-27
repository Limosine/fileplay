<script lang="ts">
  import { Icon } from "@smui/common";
  import Card, { PrimaryAction } from "@smui/card";
  import Input, { input, files } from "../lib/components/Input.svelte";
  import SetupDialog from '$lib/dialogs/SetupDialog.svelte';
  import SendDialog from "$lib/dialogs/SendDialog.svelte";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { writable } from "svelte/store";

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!e?.dataTransfer?.files) {
      return;
    }
    $files = e.dataTransfer.files;
  };
  let send_open = false;

  let sender_uuid = writable<string>();
  let recieved_files = writable<{ url: string, name: string }[]>([]);

  onMount(async () => {
    sender_uuid = (await import('$lib/peerjs')).sender_uuid;
    recieved_files = (await import('$lib/peerjs')).recieved_files;
  });
</script>

<svelte:head>
  <title>Fileplay</title>
</svelte:head>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />
<SetupDialog/>
<SendDialog open={send_open} />

<div class="center">
  {#if $sender_uuid}
    <Card padded>
      <h3>My uuid: {$sender_uuid}</h3>
    </Card>
  {/if}
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
          on:click={() => send_open = true}
          style="padding: 64px"
        >
          <Icon class="material-icons" style="font-size: 30px">send</Icon>
          Send file(s)
        </PrimaryAction>
      </Card>
    {/if}
  </div>

  {#if $files}
    <Card padded>
      <h4>Selected file(s):</h4>
      <p class="small"><br /></p>

      {#each Array.from($files) as file}
        <p>{file.name}</p>
      {/each}
    </Card>
  {/if}

  {#if $recieved_files.length != 0}
    <Card padded>
      <h4>Recieved file(s):</h4>
      <p class="small"><br /></p>

      {#each $recieved_files as recieved_file}
        <a href={recieved_file.url} download={recieved_file.name}>{recieved_file.name}</a><br/>
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
