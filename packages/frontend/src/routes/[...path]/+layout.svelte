<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { onMount, type Snippet } from "svelte";
  import { quadOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";
  import * as materialSymbols from "beercss/dist/cdn/material-symbols-outlined.woff2";

  import {
    closeDialog,
    getPath,
    largeDialog,
    offline,
    openDialog,
    path,
    registration,
  } from "$lib/lib/UI";

  import logo from "$lib/assets/Fileplay.svg";
  import Layout from "$lib/components/Layout.svelte";
  import Dialog from "$lib/components/Dialog.svelte";
  import LargeDialog from "$lib/components/LargeDialog.svelte";

  let {
    children,
  }: {
    children?: Snippet;
  } = $props();

  let webManifest = $state("");
  let overlay: "" | "hidden" = $state("");

  onMount(async () => {
    if (pwaInfo) webManifest = pwaInfo.webManifest.linkTag;

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
        closeDialog();
        if ($largeDialog?.open) ui("#dialog-large");

        $offline = true;
        overlay = "";
      });
    }

    if (pwaInfo && "serviceWorker" in navigator) {
      try {
        const r = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });

        $registration = r;
        open();
      } catch (e: any) {
        console.log("SW registration error", e);
      }
    }

    if (localStorage.getItem("privacyAccepted") === null)
      openDialog({ mode: "privacy" });
  });

  $effect(() => {
    if (browser) $path = getPath(location.pathname, $page.url.pathname);
  });
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
  <link
    rel="preload"
    as="font"
    href={materialSymbols.default}
    type="font/woff2"
    crossorigin="anonymous"
  />
</svelte:head>

{#if !overlay}
  <div
    id="overlay"
    in:fade={{ duration: 200 }}
    out:fade={{ delay: 200, duration: 1000, easing: quadOut }}
  ></div>

  <div
    id="logo"
    class={overlay}
    in:fade={{ duration: 200 }}
    out:fade={{ delay: 200, duration: 1000, easing: quadOut }}
  >
    <img id="logo-image" src={logo} alt="Fileplay" draggable="false" />
  </div>

  <div
    id="offline"
    class="center-align"
    in:fade={{ duration: 200 }}
    out:fade={{ delay: 200, duration: 1000, easing: quadOut }}
  >
    {#if $offline}
      <i class="extra">cloud_off</i>
      <p class="large-text">Offline, please connect to the internet.</p>
    {/if}
  </div>
{/if}

<div id="overlay" class={overlay}></div>

{#if overlay}
  <!-- Dialogs -->
  {#if $path.main == "send" || $path.main == "groups" || $path.main == "settings"}
    <LargeDialog />
  {/if}
  <Dialog />

  <Layout>
    {#if children}
      {@render children()}
    {/if}
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
