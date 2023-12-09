<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Input, { files } from "$lib/components/Input.svelte";
  import { addContactDialog, add_mode, current, editDialog, notificationDialog, settings_page, user_loaded } from "$lib/lib/UI";
  import { getCombined } from "$lib/lib/fetchers";

  import Home from "$lib/pages/Home.svelte";
  import Contacts from "$lib/pages/Contacts.svelte";
  import Settings from "$lib/pages/Settings.svelte";
  import { page } from "$app/stores";

  let cachedFiles: DataTransfer;

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
  }

  const openAddDialog = () => {
    if ($current == "Contacts"){
      $add_mode = "contact";
    } else {
      $add_mode = "device";
    }
    ui("#dialog-add");
  }

  let refresh_interval: any;

  function startRefresh() {
    refresh_interval = setInterval(async () => {
      if ($current == "Settings" && $settings_page == "devices") {
        getCombined(["user", "devices"]);
      } else if ($current == "Settings") {
        getCombined(["user"]);
      } else if ($current == "Contacts") {
        getCombined(["contacts"]);
      } else if ($files !== undefined && $files.length != 0) {
        getCombined(["contacts", "deviceInfos"]);
      } else {
        getCombined(["deviceInfos"]);
      }
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(refresh_interval);
  }

  onDestroy(stopRefresh);

  onMount(async () => {
    getCombined(["user", "devices", "deviceInfos", "contacts"]);
    startRefresh();

    if ($page.url.searchParams.has("shared")) {
      const cache = await caches.open("shared-files");
      const responses = await cache.matchAll("shared-file");
      cachedFiles = new DataTransfer();

      console.log(responses);

      responses.forEach(async response => {
        cachedFiles.items.add(new File([await response.blob()], 'file.txt', {type: 'text/plain'}));
      });

      console.log(cachedFiles.files);

      $files = cachedFiles.files;
      await cache.delete("shared-file");
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
{:else if $current == "Settings" && $user_loaded}
  <Settings />
{/if}

{#if $current == "Contacts" || ($current == "Settings" && $settings_page == "devices")}
  <!-- eslint-disable no-undef -->
  <!-- svelte-ignore missing-declaration -->
  <button id="add-mobile" class="s square round extra" on:click={() => openAddDialog()}>
    <i>add</i>
  </button>

  <!-- svelte-ignore missing-declaration -->
  <button id="add-desktop" class="l m square round extra" on:click={() => openAddDialog()}>
    <i>add</i>
  </button>
  <!-- eslint-enable no-undef -->
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
