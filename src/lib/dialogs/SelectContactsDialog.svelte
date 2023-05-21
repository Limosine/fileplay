<script lang="ts">
  import Button, { Label } from "@smui/button";
  import Dialog, { Actions, Content, Title } from "@smui/dialog";
  import type { Writable } from "svelte/store";

  export let files: Writable<FileList>;
  export let open: boolean = false;
  export let clearFiles: () => void;
  // show selected files, clear selected files on cancel
</script>

<Dialog
  bind:open
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={clearFiles}
>
  <Title id="title">Select contact(s)</Title>
  <Content>
    <p>Files:</p>
    {#if $files && $files.length > 0}
      {#each Array.from($files) as f}
        <p>{f.name}</p>
      {/each}
    {/if}
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="confirm">
      <Label>Send</Label>
    </Button>
  </Actions>
</Dialog>
