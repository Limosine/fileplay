<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import Input from "$lib/components/Input.svelte";
  import { setup } from "$lib/lib/encryption";
  import { handleMessage } from "$lib/lib/fetchers";
  import {
    addDialog,
    add_mode,
    current,
    editDialog,
    notificationDialog,
    rawFiles,
    settings_page,
    user,
  } from "$lib/lib/UI";
  import { awaitReady } from "$lib/sharing/send";

  import Contacts from "$lib/pages/Contacts.svelte";
  import Home from "$lib/pages/Home.svelte";
  import Settings from "$lib/pages/Settings.svelte";

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!e?.dataTransfer?.files) {
      return;
    }
    rawFiles.set(e.dataTransfer.files);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Close dialog, cancel selection, etc.
      if ($notificationDialog.open) {
        ui("#dialog-notifications");
      } else if ($editDialog.open) {
        ui("#dialog-edit");
      } else if ($addDialog.open) {
        ui("#dialog-add");
      }
    } else if (event.key === "Enter") {
      // Submit selection (if valid value), etc.
      if ($editDialog.open) {
        ui("#dialog-edit");
      }
    }
  };

  const openAddDialog = () => {
    if ($current == "Contacts") {
      $add_mode = "contact";
    } else {
      $add_mode = "device";
    }
    ui("#dialog-add");
  };

  let loaded = false;
  const onLoading = async () => {
    if (localStorage.getItem("loggedIn")) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
      await setup();
      apiClient("ws");

      if ($page.url.searchParams.has("share-target")) {
        navigator.serviceWorker.controller?.postMessage("share-ready");
      }

      if ($page.url.searchParams.has("accept-target")) {
        const didString = $page.url.searchParams.get("did");
        const nid = $page.url.searchParams.get("nid");
        if (didString !== null && nid !== null)
          awaitReady(Number(didString), nid);
      }
    }
  };

  onMount(() => {
    if (!loaded) {
      loaded = true;
      onLoading();
    }
  });
</script>

<svelte:window
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault
  on:keydown={handleKeyDown}
/>

<Input />

{#if $current == "Home"}
  <Home />
{:else if $current == "Contacts"}
  <Contacts />
{:else if $current == "Settings" && $user !== undefined}
  <Settings />
{/if}

{#if $current == "Contacts" || ($current == "Settings" && $settings_page == "devices")}
  <button
    id="add-mobile"
    class="s square round extra"
    on:click={() => openAddDialog()}
  >
    <i>add</i>
  </button>

  <button
    id="add-desktop"
    class="l m square round extra"
    on:click={() => openAddDialog()}
  >
    <i>add</i>
  </button>
{/if}

<style>
  #add-mobile {
    position: fixed;
    bottom: 95px;
    right: 15px;
    margin: 0;
  }

  #add-desktop {
    position: fixed;
    bottom: 20px;
    right: 20px;
    margin: 0;
  }
</style>
