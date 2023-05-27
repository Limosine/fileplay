<script lang="ts">
  import { Icon } from "@smui/common";
  import Card, { PrimaryAction } from "@smui/card";
  import Input, { input, files } from "../lib/components/Input.svelte";
  import { goto } from "$app/navigation";
  import SetupDialog from '$lib/dialogs/SetupDialog.svelte';
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!e?.dataTransfer?.files) {
      return;
    }
    $files = e.dataTransfer.files;
  };
</script>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />
<SetupDialog/>

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
          on:click={() => goto("/contacts/select")}
          style="padding: 64px"
        >
          <Icon class="material-icons" style="font-size: 30px">contacts</Icon>
          Select contact(s)
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
