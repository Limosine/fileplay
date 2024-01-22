<script lang="ts">
  import { page } from "$app/stores";
  import { onDestroy, onMount } from "svelte";

  import Input, { files } from "$lib/components/Input.svelte";
  import {
    startHeartbeat,
    stopHeartbeat,
    startSubscriptions,
    stopSubscriptions,
  } from "$lib/lib/fetchers";
  import {
    addContactDialog,
    add_mode,
    current,
    editDialog,
    notificationDialog,
    settings_page,
    user,
  } from "$lib/lib/UI";
  import Contacts from "$lib/pages/Contacts.svelte";
  import Home from "$lib/pages/Home.svelte";
  import Settings from "$lib/pages/Settings.svelte";
  import { setup } from "$lib/lib/encryption";

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!e?.dataTransfer?.files) {
      return;
    }
    $files = e.dataTransfer.files;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Close dialog, cancel selection, etc.
      if ($notificationDialog.open) {
        ui("#dialog-notifications");
      } else if ($editDialog.open) {
        ui("#dialog-edit");
      } else if ($addContactDialog.open) {
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

  const handleMessage = (
    event: MessageEvent<{ data: any; action: string }>,
  ) => {
    if (event.data.action == "load-data") {
      const swFiles: File[] = event.data.data;
      const dataTransfer = new DataTransfer();

      swFiles.forEach((file) => {
        dataTransfer.items.add(file);
        $files = dataTransfer.files;
      });

      navigator.serviceWorker.removeEventListener("message", handleMessage);
      $page.url.searchParams.delete("share-target");
    }
  };

  onMount(() => {
    if ($page.url.hostname != "localhost" && localStorage.getItem("loggedIn")) {
      setup();
      startHeartbeat();
      startSubscriptions();
    }

    if ($page.url.searchParams.has("share-target")) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
      navigator.serviceWorker.controller?.postMessage("share-ready");
    }
  });

  onDestroy(() => {
    stopHeartbeat();
    stopSubscriptions();
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
