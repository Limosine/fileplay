<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { Capacitor } from "@capacitor/core";
  import { onMount } from "svelte";
  import { quadOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";

  import { notifications } from "$lib/lib/notifications";
  import {
    getPath,
    offline,
    openDialog,
    path,
    registration,
  } from "$lib/lib/UI";

  import logo from "$lib/assets/Fileplay.svg";
  import Layout from "$lib/components/Layout.svelte";
  import Notifications from "$lib/components/Notifications.svelte";
  import Dialog from "$lib/components/Dialog.svelte";

  let overlay: "" | "hidden" = "";

  onMount(async () => {
    const open = () => {
      if (
        localStorage.getItem("subscribedToPush") === null &&
        localStorage.getItem("privacyAccepted") == "true"
      )
        openDialog({ mode: "request" });
    };

    if (browser) {
      $offline = !navigator.onLine;

      if (localStorage.getItem("loggedIn") == "true") overlay = "hidden";

      window.addEventListener("online", () => {
        $offline = false;
        overlay = "hidden";
      });
      window.addEventListener("offline", () => {
        $offline = true;
        overlay = "";
      });
    }

    if (Capacitor.isNativePlatform()) {
      notifications().initNativeListeners();
      open();
    } else if (pwaInfo) {
      const { useRegisterSW } = await import("virtual:pwa-register/svelte");
      useRegisterSW({
        immediate: true,
        onRegistered(r) {
          if (r !== undefined) {
            $registration = r;
            open();
          }
        },
        onRegisterError(error: any) {
          console.log("SW registration error", error);
        },
      });
    }

    if (!localStorage.getItem("privacyAccepted"))
      openDialog({ mode: "privacy" });
  });

  $: if (browser) $path = getPath(location.pathname, $page.url.pathname);

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
</svelte:head>

{#if !overlay}
  <div
    id="overlay"
    out:fade={{ delay: 200, duration: 1000, easing: quadOut }}
  />

  <div
    id="logo"
    class={overlay}
    out:fade={{ delay: 200, duration: 1000, easing: quadOut }}
  >
    <img id="logo-image" src={logo} alt="Fileplay" draggable="false" />
  </div>

  <div
    id="offline"
    class="center-align"
    out:fade={{ delay: 200, duration: 1000, easing: quadOut }}
  >
    {#if $offline}
      <i class="extra">cloud_off</i>
      <p class="large-text">Offline, please connect to the internet.</p>
    {/if}
  </div>
{/if}

<div id="overlay" class={overlay} />

{#if overlay}
  <!-- Dialogs -->
  <Dialog />
  <Notifications />

  <Layout>
    <slot />
  </Layout>
{/if}

<style>
  .hidden {
    display: none !important;
    opacity: 0;
    z-index: -1 !important;
  }

  #overlay {
    position: absolute;
    z-index: 10000;
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  #logo {
    position: absolute;
    z-index: 10001;
    width: 100%;
    height: 50%;
    top: 0;

    display: flex;
    justify-content: center;
    align-items: center;
  }

  #offline {
    position: absolute;
    z-index: 10001;
    width: 100%;
    height: 50%;
    bottom: 0;
  }

  img#logo-image {
    width: 300px;
    height: auto;
  }
</style>
