<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { type Writable } from "svelte/store";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";

  import logo from "$lib/assets/Fileplay.svg";
  import Layout from "$lib/components/Layout.svelte";
  import AddContact from "$lib/dialogs/AddContact.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import Notifications from "$lib/dialogs/Notifications.svelte";
  import QRCode from "$lib/dialogs/QRCode.svelte";
  import Send from "$lib/dialogs/Send.svelte";

  let loading = 0;

  const getClass = (loading: number) => {
    if (loading === 1) {
      return "disappear";
    } else if (loading === 2) {
      return "hidden";
    } else return "";
  };

  onMount(async () => {
    if (pwaInfo) {
      const { registerSW } = await import("virtual:pwa-register");
      registerSW({
        immediate: true,
        onRegisterError(error: any) {
          console.log("SW registration error", error);
        },
      });
    }
  });

  $: {
    if (browser) {
      if (loading === 0 && localStorage.getItem("loggedIn")) {
        loading = 1;
        setTimeout(() => {
          loading = 2;
        }, 1100);
      }
    }
  }

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
  <title>Fileplay</title>
</svelte:head>

<div id="logo" class={getClass(loading)}>
  <img id="logo-image" src={logo} alt="Fileplay" />
</div>

<div id="overlay" class={getClass(loading)} />

<!-- Dialogs -->
<Edit />
<AddContact />
<QRCode />
<Send />

<Notifications />

<Layout>
  <slot />
</Layout>

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

  img#logo-image {
    width: 300px;
    height: auto;
  }
</style>
