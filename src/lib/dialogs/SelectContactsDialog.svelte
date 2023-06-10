<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Card, { PrimaryAction } from "@smui/card";
  import Paper, { Content as P_Content } from "@smui/paper";
  import Button, { Label } from "@smui/button";
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { files } from "$lib/components/Input.svelte";
  import { open } from "$lib/stores/SelectContactStore";
  import { contacts_loaded, getContacts } from "$lib/personal";
  import { onDestroy } from "svelte";
  // import { getDicebearUrl } from "$lib/common";

  let addPendingFile: (files: FileList) => void;
  let send: (files: FileList, peerID: string, password?: string, publicKey?: string) => void

  onMount(async () => {
    addPendingFile = (await import('$lib/peerjs')).addPendingFile;
    send = (await import('$lib/peerjs')).send;
  });


  function handleSelectContactKeyDown(event: CustomEvent | KeyboardEvent) {
    if (!$open) return;
    event = event as KeyboardEvent;

    if (event.key === "Escape" || event.key === "Enter") {
      closeHandler("cancel");
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
    }

    $open = false;
  }

  let contacts_interval: any;

  function startRefresh() {
    contacts_interval = setInterval(async () => {
      if ($open) getContacts();
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(contacts_interval);
  }

  onMount(async () => {
    startRefresh();
  });

  onDestroy(stopRefresh);

  async function getDeviceInfos(): Promise<{
    did: number;
    type: string;
    displayName: string;
    peerJsId: string;
    encryptionPublicKey: string;
  }[]> {
    const res = await fetch("/api/contacts/devices", {
      method: "GET",
    });

    const devices = await res.json();

    return devices;
  }

  let ghost_items: any[];
  function setGhostItems(contacts: any[]) {
    ghost_items = new Array(4 - (contacts.length % 4));
  }

  const sent = writable<{ [did: number]: string }>({});

  const send_front = (device: {
    did: number;
    type: string;
    displayName: string;
    peerJsId: string;
    encryptionPublicKey: string;
  }) => {
    $sent[device.did] = "selected";
    send($files, device.peerJsId, undefined, device.encryptionPublicKey);
  }
</script>

<svelte:window on:keydown={handleSelectContactKeyDown} />

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
        <div id="content">
          {#if $open}
            {#await getDeviceInfos()}
              <p>Contacts are loading...</p>
            {:then devices}
              <div style="display: none">
                {setGhostItems(devices)}
              </div>
              {#each devices as device}
                <Card class={$sent[device.did]}>
                  <PrimaryAction
                    on:click={() => send_front(device)}
                    class="content-items"
                  >
                    {device.displayName}
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

  * :global(.content-items) {
    width: 100px;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
