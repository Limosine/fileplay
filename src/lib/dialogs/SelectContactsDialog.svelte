<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Card, { PrimaryAction } from "@smui/card";
  import Paper, { Content as P_Content } from "@smui/paper";
  import Button, { Label } from "@smui/button";
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { files } from "$lib/components/Input.svelte";
  import Textfield from "@smui/textfield";
  import { open } from "$lib/stores/SelectContactStore";
  import { publicKey_armored } from "$lib/openpgp";

  let addPendingFile: (files: FileList) => void;
  let multiSend = (files: FileList, reciever_uuids: string[], publicKeys: string[]) => {};

  let reciever_uuid = "";
  let reciever_uuids: string[] = [];

  var names: string[] = [
    "Computer",
    "Smartphone",
    "Tablet",
    "Laptop",
    "Smartwatch",
  ];

  for (let i = 0; i < 100; i++) {
    names.push(String(i));
  }

  var ghost_items = new Array(4 - (names.length % 4));

  onMount(async () => {
    addPendingFile = (await import('$lib/peerjs')).addPendingFile;
    multiSend = (await import('$lib/peerjs')).multiSend;
  });

  const selected = writable<{ [name: string]: string }>({});

  function handleKeyDown(event: CustomEvent | KeyboardEvent) {
    event = event as KeyboardEvent;

    if (event.key === "Escape") {
      closeHandler("cancel");
    } else if (event.key === "Enter" && !$selected) {
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
        multiSend($files, reciever_uuids, [publicKey_armored]);
        fetch("/api/sharing/selection", {
          method: "POST",
          body: JSON.stringify({
            senderName: "unknown",
            reciever_uuids
          })
        })
    }
    $open = false;
  }

  function add2array() {
    reciever_uuids[reciever_uuids.length] = reciever_uuid;
    reciever_uuid = "";
  }

  function select(name: string) {
    if ($selected[name] == "selected") {
      delete $selected[name];
      reciever_uuids.splice(reciever_uuids.indexOf(name), 1);
      $selected = $selected;
      reciever_uuids = reciever_uuids;
    } else {
      $selected[name] = "selected";
      reciever_uuids[reciever_uuids.length] = name;
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<Dialog
  bind:open={$open}
  aria-labelledby="title"
  aria-describedby="content"
  on:SMUIDialog:closed={closeHandler}
>
  <Title id="title">Select contact(s)</Title>
  <Content>
    <Paper variant="unelevated">
      <P_Content>
        <div id="content-uuid">
          <div id="row">
            <Textfield bind:value={reciever_uuid} label="Reciever UUID" />
            <Button variant="unelevated" on:click={add2array}>Add</Button>
          </div>
          <p>Selected contact(s):</p>
          {#each reciever_uuids as uuid}
            <p>{uuid}</p>
          {/each}
        </div>
        <div id="content">
          {#each names as name}
            <Card class={$selected[name]}>
              <PrimaryAction
                on:click={() => select(name)}
                class="content-items"
              >
                {name}
              </PrimaryAction>
            </Card>
          {/each}
          {#each ghost_items as ghost_item}
          <div class="content-items" />
          {/each}
        </div>
      </P_Content>
    </Paper>
  </Content>
  <Actions>
    <Button action="cancel">
      <Label>Cancel</Label>
    </Button>
    <Button action="link">
      <Label>Via Link</Label>
    </Button>
    <Button action="confirm">
      <Label>Send</Label>
    </Button>
  </Actions>
</Dialog>

<style>
  #content {
    display: flex;
    flex-basis: auto;
    flex-flow: row wrap;
    justify-content: center;
    gap: 5px;
  }
  
  #content-uuid {
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

  * :global(.content-items) {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
