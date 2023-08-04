<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  import Input, { files } from "$lib/components/Input.svelte";
  import { current, settings_page, user_loaded } from "$lib/lib/UI";
  import {
    updateContacts,
    getDevices,
    getDeviceInfos,
    getContent,
  } from "$lib/lib/fetchers";

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

  let refresh_interval: any;

  function startRefresh() {
    refresh_interval = setInterval(async () => {
      if ($current == "Contacts") {
        updateContacts();
        if ($files !== undefined && $files.length != 0) {
          getDeviceInfos();
        }
      }
      if ($current == "Settings" && $settings_page == "devices") getDevices();
    }, 5000);
  }

  function stopRefresh() {
    clearInterval(refresh_interval);
  }

  onDestroy(stopRefresh);

  onMount(() => {
    getContent();
    startRefresh();
  });

  /* async function notificationPermission() {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        return true;
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") return true;
      }
    }
    return false;
  }

  async function sendNotification(text: string) {
    if (await notificationPermission()) {
      new Notification(text);
    }
  } */
</script>

<svelte:window on:drop|preventDefault={handleDrop} on:dragover|preventDefault />

<Input />

{#if $current == "Home"}
  <Home />
{:else if $current == "Contacts"}
  <Contacts />
{:else if $current == "Settings" && $user_loaded}
  <Settings />
{/if}