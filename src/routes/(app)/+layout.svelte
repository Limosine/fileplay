<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import { writable, type Readable, type Writable } from "svelte/store";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";

  import logo from "$lib/assets/Fileplay.png";
  import { addNotification } from "$lib/lib/UI";
  import { createWebSocket } from "$lib/lib/websocket";
  import { setup as pgp_setup } from "$lib/lib/openpgp";

  import Layout from "$lib/components/Layout.svelte";
  import Notifications from "$lib/dialogs/Notifications.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import AddContact from "$lib/dialogs/AddContact.svelte";

  let peer_open = writable(false);

  let needRefresh: Writable<boolean>;
  let loading = true;

  onMount(async () => {
    if ($page.url.hostname != "localhost" && localStorage.getItem("loggedIn")) {
      pgp_setup();
      createWebSocket();
    }

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
      loading = !$peer_open || !localStorage.getItem("loggedIn");
    }
  }

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";
  $: if ($needRefresh) {
    addNotification({
      title: "New version available",
      body: "Click here to update",
      tag: "new_sw_version",
      actions: [
        {
          title: "Update",
          action: "update_sw",
        },
      ],
    });
  }
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html webManifest}
  <title>Fileplay</title>
</svelte:head>

<div id="logo">
  <img id="logo-image" src={logo} alt="Fileplay" />
</div>
<div id="start">
  <div class="center-align">
    <!-- svelte-ignore a11y-missing-attribute a11y-missing-content -->
    <progress class="circle medium" />
  </div>
</div>

{#if !loading}
  <!-- Dialogs -->
  <Edit />
  <AddContact />

  <div id="overlay" />

  <Notifications />

  <Layout>
    <slot />
  </Layout>
{/if}

<style>
  #overlay {
    position: absolute;
    z-index: 0;
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  #logo {
    position: absolute;
    z-index: -1;
    width: 100%;
    height: 50%;
    top: 0;

    display: flex;
    justify-content: center;
    align-items: center;
  }

  #start {
    position: absolute;
    z-index: -1;
    width: 100%;
    height: 50%;
    bottom: 0;
  }

  img#logo-image {
    width: 300px;
    height: auto;
  }
</style>
