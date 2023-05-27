<script lang="ts">
  import { onMount } from "svelte";
  import { files } from "$lib/components/Input.svelte";

  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Button, { Label } from "@smui/button";
  import Textfield from '@smui/textfield';

  let addPendingFile: (files: FileList) => void;
  let multiSend = (files: FileList, reciever_uuids: string[]) => {};

  let reciever_uuid = "";
  let reciever_uuids: string[] = [];

  onMount(async () => {
    addPendingFile = (await import('$lib/peerjs')).addPendingFile;
    multiSend = (await import('$lib/peerjs')).multiSend;
  });

  export let open: boolean;

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Escape") {
      closeHandler("cancel");
    } else if (event.key === "Enter" && reciever_uuid) {
      closeHandler("confirm");
    }
  }
  
  function closeHandler(e: CustomEvent<{ action: string }> | string) {
    let action: string;

    if (typeof e === "string") {
      action = e;
    } else {
      action = e.detail.action;
    }

    switch (action) {
      case "link":
        addPendingFile($files);
      case "confirm":
        multiSend($files, reciever_uuids);
    }
  }

  function add2array() {
    reciever_uuids[reciever_uuids.length] = reciever_uuid;
    reciever_uuid = "";
  }
</script>

<svelte:window on:keydown={handleKeyDown}/>

<Dialog
  bind:open
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Send file(s)</Title>
  <Content>
    <div id="content">
      <div id="row">
        <Textfield bind:value={reciever_uuid} label="Reciever UUID" />
        <Button variant="unelevated" on:click={add2array}>Add</Button>
      </div>
      {#each reciever_uuids as uuid}
        <p>{uuid}</p>
      {/each}
    </div>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="link">
      <Label>Via Link</Label>
    </Button>
    <Button action="confirm" disabled={reciever_uuids.length == 0}>
      <Label>Send</Label>
    </Button>
  </Actions>
</Dialog>

<style>
#content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
#row {
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
}
</style>