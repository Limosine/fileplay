<script lang="ts">
  import Dialog, { Title, Content, Actions } from "@smui/dialog";
  import Card, { PrimaryAction, Media, MediaContent } from "@smui/card";
  import Paper, { Content as P_Content } from "@smui/paper";
  import Button, { Label } from "@smui/button";
  import { writable } from "svelte/store";
  import { onMount } from "svelte";
  import { files } from "$lib/components/Input.svelte";
  import { open } from "$lib/stores/SelectContactStore";
  import {
    deviceInfos_loaded,
    deviceInfos,
    getDeviceInfos,
  } from "$lib/personal";
  import { getDicebearUrl } from "$lib/common";
  import { userParams } from "$lib/stores/Dialogs";

  let addPendingFile: (files: FileList) => void;
  let send: (
    files: FileList,
    peerID: string,
    password?: string,
    publicKey?: string
  ) => void;

  onMount(async () => {
    addPendingFile = (await import("$lib/peerjs")).addPendingFile;
    send = (await import("$lib/peerjs")).send;
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

  let ghost_items;
  function setGhostItems(devices: any[]) {
    ghost_items = new Array(4 - (devices.length % 4));
  }

  const sent = writable<{ [did: number]: boolean }>({});

  const send_front = (device: {
    did: number;
    type: string;
    displayName: string;
    peerJsId: string;
    encryptionPublicKey: string;
  }) => {
    $sent[device.did] = true;
    send($files, device.peerJsId, undefined, device.encryptionPublicKey);
  };
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
          {#if $deviceInfos_loaded}
            {#await $deviceInfos}
              <p>Contacts are loading...</p>
            {:then devices}
              <div style="display: none">
                {setGhostItems(devices)}
              </div>
              {#each devices as device}
                {#if $sent[device.did]}
                  <Card class="selected" style="padding-top: 20px;">
                    <Media
                      style="background-image: url({getDicebearUrl(
                        $userParams.avatarSeed,
                        150
                      )}); background-size: contain;"
                      aspectRatio="16x9"
                    />
                    <Content>{device.displayName}</Content>
                  </Card>
                {:else}
                  <Card on:click={() => send_front(device)}>
                    <PrimaryAction style="padding-top: 20px;">
                      <Media
                        style="background-image: url({getDicebearUrl(
                          $userParams.avatarSeed,
                          150
                        )}); background-size: contain;"
                        aspectRatio="16x9"
                      />
                      <Content>{device.displayName}</Content>
                    </PrimaryAction>
                  </Card>
                {/if}
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
