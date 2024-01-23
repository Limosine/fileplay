<script lang="ts">
  import { onMount } from "svelte";
  import { type Writable } from "svelte/store";
  import { pwaInfo } from "virtual:pwa-info";
  import { useRegisterSW } from "virtual:pwa-register/svelte";

  import "beercss";

  import logo from "$lib/assets/Fileplay.svg";
  import Layout from "$lib/components/Layout.svelte";
  import AddContact from "$lib/dialogs/AddContact.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import QRCode from "$lib/dialogs/QRCode.svelte";
  import Notifications from "$lib/dialogs/Notifications.svelte";
  import { browser } from "$app/environment";

  let needRefresh: Writable<boolean>;
  let loading = 0;

  const getClass = (loading: number) => {
    if (loading === 1) {
      return "disappear";
    } else if (loading === 2) {
      return "hidden";
    } else return "";
  };

  onMount(async () => {
    // update service worker
    if (pwaInfo) {
      const update = async (registration: ServiceWorkerRegistration) => {
        // check if sw is installing or navigator is offline
        if (!(!registration.installing && navigator)) return;
        if ("connection" in navigator && !navigator.onLine) return;

        await registration.update();
      };

      needRefresh = await useRegisterSW({
        async onRegisteredSW(
          _swScriptUrl: string,
          registration: ServiceWorkerRegistration | undefined,
        ) {
          if (registration) {
            setInterval(
              async () => await update(registration),
              30 * 60 * 1000, // 5 mins secs (for debugging)
            );
            await update(registration);
            registration.waiting?.postMessage({ type: "skip_waiting" });
          }
        },
        onRegisterError(error: any) {
          console.error("SW registration error", error);
        },
      }).needRefresh;
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
