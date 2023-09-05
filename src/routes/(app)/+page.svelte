<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  import Input, { files } from "$lib/components/Input.svelte";
  import { addContactDialog, current, editDialog, notificationDialog, settings_page, user_loaded } from "$lib/lib/UI";
  import { getCombined } from "$lib/lib/fetchers";

  import Home from "$lib/pages/Home.svelte";
  import Contacts from "$lib/pages/Contacts.svelte";
  import Settings from "$lib/pages/Settings.svelte";

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

  onMount(() => {
    getCombined(["user", "devices", "deviceInfos", "contacts"]);
    startRefresh();
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
