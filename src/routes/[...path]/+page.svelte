<script lang="ts">
  import { page } from "$app/stores";
  import { Capacitor } from "@capacitor/core";
  import { onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import Input from "$lib/components/Input.svelte";
  import { setup } from "$lib/lib/encryption";
  import { handleMessage } from "$lib/lib/fetchers";
  import { addListeners } from "$lib/lib/send-target";
  import {
    closeDialog,
    dialogMode,
    height,
    layout,
    openDialog,
    path,
    rawFiles,
    user,
    width,
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
    $rawFiles = e.dataTransfer.files;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Close dialog, cancel selection, etc.
      closeDialog();
    } else if (event.key === "Enter") {
      // Submit selection (if valid value), etc.
      if ($dialogMode == "edit") {
        closeDialog();
      }
    }
  };

  const openAddDialog = () =>
    openDialog({
      mode: "add",
      currentU: $path.main == "contacts" ? "contact" : "device",
    });

  let loaded = false;
  const onLoading = async () => {
    if (localStorage.getItem("loggedIn")) {
      if (Capacitor.isNativePlatform()) await addListeners();
      else navigator.serviceWorker.addEventListener("message", handleMessage);

      await setup();
      apiClient("ws");

      if (!Capacitor.isNativePlatform()) {
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
    }
  };

  onMount(() => {
    if (!loaded) {
      loaded = true;
      onLoading();
    }
  });

  $: $layout = $width < 840 ? "mobile" : "desktop";
</script>

<svelte:window
  bind:innerHeight={$height}
  bind:innerWidth={$width}
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault
  on:keydown={handleKeyDown}
/>

<Input />

{#if $path.main == "home"}
  <Home />
{:else if $path.main == "contacts"}
  <Contacts />
{:else if $path.main == "settings" && $user !== undefined}
  <Settings />
{/if}

{#if $path.main == "contacts" || ($layout == "mobile" && $path.main == "settings" && "sub" in $path)}
  {#if $layout == "mobile"}
    <button
      id="add-mobile"
      class="square round extra"
      on:click={() => openAddDialog()}
    >
      <i>add</i>
    </button>
  {:else}
    <button
      id="add-desktop"
      class="square round extra"
      on:click={() => openAddDialog()}
    >
      <i>add</i>
    </button>
  {/if}
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
