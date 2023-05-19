<script lang="ts">
  import { Icon } from '@smui/common';
  import Card, { PrimaryAction } from '@smui/card';
  import Input, { input, files } from '../lib/components/Input.svelte'
  import { goto } from '$app/navigation';

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    if (!e?.dataTransfer?.files) {
      return
    }
    $files = e.dataTransfer.files
  }

  const handleDragOver = (e: Event) => {
    e.preventDefault()
  }
  
  const onClick = () => {
    $input.click()
  }
</script>

<Input />

<div class="center">
  <div class="beside">
    <div on:drop={handleDrop} on:dragover={handleDragOver}>
      <Card>
        <PrimaryAction on:click={onClick}  style="padding: 64px">
          <Icon class="material-icons" style="font-size: 30px"
          >upload</Icon>
          Select file(s)
        </PrimaryAction>
      </Card>
    </div>

    {#if $files}
    <Card>
      <PrimaryAction on:click={() => goto('/contacts/select')}  style="padding: 64px">
        <Icon class="material-icons" style="font-size: 30px"
        >contacts</Icon>
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
