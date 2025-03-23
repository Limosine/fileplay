<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";

  import { apiClient } from "$lib/api/client";
  import Input from "$lib/components/Input.svelte";
  import { setup } from "$lib/lib/encryption";
  import { handleMessage } from "$lib/lib/fetchers";
  import { ui_object } from "$lib/lib/UI.svelte";
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
    ui_object.rawFiles = e.dataTransfer.files;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Close dialog, cancel selection, etc.
      ui_object.closeDialog();
    } else if (event.key === "Enter") {
      // Submit selection (if valid value), etc.
      if (
        ui_object.dialogProperties.mode == "edit" ||
        ui_object.dialogProperties.mode == "delete"
      ) {
        ui_object.closeDialog(true);
      }
    }
  };

  let loaded = false;
  const onLoading = async () => {
    if (localStorage.getItem("loggedIn")) {
      navigator.serviceWorker?.addEventListener("message", handleMessage);

      await setup();
      apiClient("ws");

      if (page.url.searchParams.has("share-target")) {
        navigator.serviceWorker?.controller?.postMessage("share-ready");
      }

      if (page.url.searchParams.has("accept-target")) {
        const didString = page.url.searchParams.get("did");
        const nid = page.url.searchParams.get("nid");
        if (didString !== null && nid !== null) {
          manager.awaitReady(Number(didString), nid);
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
</script>

<svelte:window
  bind:innerHeight={ui_object.height}
  bind:innerWidth={ui_object.width}
  on:drop|preventDefault={handleDrop}
  on:dragover|preventDefault
  on:keydown={handleKeyDown}
/>

<Input />

{#if ui_object.path.main == "send" || ui_object.path.main == "receive"}
  {#if ui_object.layout == "mobile"}
    {#if ui_object.path.main == "send"}
      <Send />
    {:else}
      <Receive />
    {/if}
  {:else}
    <div id="main">
      <div>
        <Send />
      </div>
      {#if manager.incoming.length > 0}
        <div>
          <Receive />
        </div>
      {/if}
    </div>
  {/if}
{:else if ui_object.path.main == "contacts" && ui_object.contacts !== undefined}
  <Contacts />
{:else if ui_object.path.main == "groups" && ui_object.groups !== undefined && ui_object.groupDevices !== undefined}
  <Groups />
{:else if ui_object.path.main == "settings" && ui_object.user !== undefined}
  <Settings />
{/if}

<style>
  #main {
    height: 100%;
    display: flex;
    flex-flow: row nowrap;
  }

  #main > * {
    flex: 1 1 0;
  }
</style>
