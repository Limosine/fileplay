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

  import { contacts, contacts_loaded, getContacts } from "$lib/personal";

  let addPendingFile: (files: FileList) => void;
  let multiSend = (files: FileList, reciever_uuids: string[], publicKeys: string[]) => {};

  let reciever_uuid = "";
  let reciever_uuids: string[] = [];

  onMount(async () => {
    addPendingFile = (await import('$lib/peerjs')).addPendingFile;
    multiSend = (await import('$lib/peerjs')).multiSend;
  });

  const selected = writable<{ [name: string]: string }>({});

  let ghost_items: any[];
  function setGhostItems(contacts: {
    cid: number;
    displayName: string;
    avatarSeed: string;
    linkedAt: number;
    isOnline: number;
  }[]) {
    ghost_items = new Array(4 - (contacts.length % 4));
  }

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
          {#if $contacts_loaded}
            {#await $contacts}
              <p>Contacts are loading...</p>
            {:then contacts}
              <div style="display: none">
                {setGhostItems(contacts)}
              </div>
              {#each contacts as contact}
                <Card class={$selected[contact.displayName]}>
                  <PrimaryAction
                    on:click={() => select(contact.displayName)}
                    class="content-items"
                  >
                    {contact.displayName}
                  </PrimaryAction>
                </Card>
              {/each}
            {:catch}
              <p>Failed to load contacts.</p>
            {/await}
          {/if}
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
