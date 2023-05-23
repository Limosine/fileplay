<script lang="ts">
  import { Icon } from "@smui/common";
  import Card, { PrimaryAction } from "@smui/card";
  import SetupDialog from "$lib/dialogs/SetupDialog.svelte";
  import SelectContactsDialog from "$lib/dialogs/SelectContactsDialog.svelte";
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { state } from "$lib/stores/state";

  const files = writable<FileList>();

  let fileInput: HTMLInputElement;
  let emptyFileInput: HTMLInputElement;
  let SetupDialogIsOpen = false;
  let SelectContactsDialogIsOpen = false;

  const clearFiles = () => {
    if (emptyFileInput.files) $files = emptyFileInput.files;
    fileInput.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    if (!e?.dataTransfer?.files || SetupDialogIsOpen) {
      return;
    }
    $files = e.dataTransfer.files;
  };
</script>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<input
  style="display: none"
  type="file"
  bind:this={fileInput}
  on:change={() => {
    if (fileInput.files) $files = fileInput.files;
  }}
  multiple
/>
<input type="file" style="display: none" bind:this={emptyFileInput} />

<div class="root">
  <SetupDialog bind:open={SetupDialogIsOpen} />
  <SelectContactsDialog
    bind:open={SelectContactsDialogIsOpen}
    {files}
    {clearFiles}
  />
  <Card>
    <PrimaryAction on:click={() => fileInput.click()} style="padding: 64px">
      <Icon class="material-icons" style="font-size: 30px">check</Icon>
      Select file(s)
    </PrimaryAction>
  </Card>
  {#if $files?.length > 0}
    <Card>
      <PrimaryAction
        on:click={() => (SelectContactsDialogIsOpen = true)}
        style="padding: 64px"
      >
        <Icon class="material-icons" style="font-size: 30px">send</Icon>
        Share
      </PrimaryAction>
    </Card>
  {/if}
</div>

<style>
  .root {
    padding: 1em;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1em;
  }
</style>
