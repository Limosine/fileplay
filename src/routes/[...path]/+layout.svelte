<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { Capacitor } from "@capacitor/core";
  import { onMount } from "svelte";
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

  let loading = 0;
  let offlineVisible = false;

  const getClass = (loading: number, offline: boolean) => {
    if (loading === 0 || offline) return "";
    else if (loading === 1) {
      return "disappear";
    } else if (loading === 2) {
      return "hidden";
    }
  };

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

      window.addEventListener("online", () => {
        loading = 0;
        offlineVisible = true;
        $offline = false;
      });
      window.addEventListener("offline", () => ($offline = true));
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

  $: {
    if (browser) {
      if (loading === 0 && localStorage.getItem("loggedIn")) {
        loading = 1;
        setTimeout(() => {
          loading = 2;
          offlineVisible = false;
        }, 1100);
      }
    }
  }

  $: if (browser) $path = getPath(location.pathname, $page.url.pathname);

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
</svelte:head>

<div id="logo" class={getClass(loading, $offline)}>
  <img id="logo-image" src={logo} alt="Fileplay" draggable="false" />
</div>
{#if $offline || offlineVisible}
  <div id="offline" class="center-align {getClass(loading, $offline)}">
    <i class="extra">cloud_off</i>
    <p class="large-text">Offline, please connect to the internet.</p>
  </div>
{/if}

<div id="overlay" class={getClass(loading, $offline)} />

{#if loading !== 0 && !$offline}
  <!-- Dialogs -->
  <Dialog />
  <Notifications />

  <Layout>
    <slot />
  </Layout>
{/if}

<style>
  .disappear {
    opacity: 0;
    transition: opacity 1s;
  }

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
