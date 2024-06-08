<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import Input from "$lib/components/Input.svelte";
  import { setup } from "$lib/lib/encryption";
  import { handleMessage } from "$lib/lib/fetchers";
  import {
    closeDialog,
    contacts,
    dialogProperties,
    groupDevices,
    groups,
    height,
    path,
    rawFiles,
    user,
    width,
  } from "$lib/lib/UI";
  import { manager } from "$lib/sharing/manager.svelte";

  import Contacts from "$lib/pages/Contacts.svelte";
  import Groups from "$lib/pages/Groups.svelte";
  import Receive from "$lib/pages/Receive.svelte";
  import Send from "$lib/pages/Send.svelte";
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
      if (
        $dialogProperties.mode == "edit" ||
        $dialogProperties.mode == "delete"
      ) {
        closeDialog(true);
      }
    }
  };

  let loaded = false;
  const onLoading = async () => {
    if (localStorage.getItem("loggedIn")) {
      navigator.serviceWorker?.addEventListener("message", handleMessage);

      await setup();
      apiClient("ws");

      if ($page.url.searchParams.has("share-target")) {
        navigator.serviceWorker?.controller?.postMessage("share-ready");
      }

      if ($page.url.searchParams.has("accept-target")) {
        const didString = $page.url.searchParams.get("did");
        const nid = $page.url.searchParams.get("nid");
        if (didString !== null && nid !== null)
          manager.awaitReady(Number(didString), nid);
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
  bind:innerHeight={$height}
  bind:innerWidth={$width}
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault
  on:keydown={handleKeyDown}
/>

<Input />

{#if $path.main == "send"}
  <Send />
{:else if $path.main == "receive"}
  <Receive />
{:else if $path.main == "contacts" && $contacts !== undefined}
  <Contacts />
{:else if $path.main == "groups" && $groups !== undefined && $groupDevices !== undefined}
  <Groups />
{:else if $path.main == "settings" && $user !== undefined}
  <Settings />
{/if}
