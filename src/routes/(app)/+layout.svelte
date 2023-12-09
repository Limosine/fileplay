<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import { writable, type Readable, type Writable } from "svelte/store";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";

  import logo from "$lib/assets/Fileplay.png";
  import { addNotification, current } from "$lib/lib/UI";
  import { createSocketStore } from "$lib/lib/websocket";
  import { setup as pgp_setup } from "$lib/lib/openpgp";

  import Layout from "$lib/components/Layout.svelte";
  import Notifications from "$lib/dialogs/Notifications.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import AddContact from "$lib/dialogs/AddContact.svelte";
  import { files } from "$lib/components/Input.svelte";

  let peer_open = writable(false);
  let socketStore: Readable<any>;
  let unsubscribeSocketStore = () => {};

  let needRefresh: Writable<boolean>;
  let loading = true;

  onMount(async () => {
    if ($page.url.hostname != "localhost" && localStorage.getItem("loggedIn")) {
      createSocketStore();

      peer_open = (await import("$lib/peerjs/common")).peer_open;
      const { openPeer, listen } = await import("$lib/peerjs/main");

      pgp_setup();
      openPeer();
      listen();

      socketStore = (await import("$lib/lib/websocket")).socketStore;
      unsubscribeSocketStore = socketStore.subscribe(() => {});
    }

    window.addEventListener('load', async () => {
      if (location.search.includes("share-target")) {
        const keys = await caches.keys();
        const mediaCache = await caches.open(
          keys.filter((key) => key.startsWith("media"))[0],
        );
        const responseArray = await mediaCache.matchAll("shared-file");
        if (responseArray) {
          const fileArray = new FileList();

          for (let i = 0; i < responseArray.length; i++) {
            fileArray[i] = (await responseArray[i].blob()) as File;
          }

          files.update(() => fileArray);
          current.set("Home");

          await mediaCache.delete("shared-file");
        }
      }
    });
    

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

  onDestroy(() => {
    if (socketStore) unsubscribeSocketStore();
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

  /* p.small {
    line-height: 0.2;
  }
  .beside {
    display: flex;
    flex-basis: auto;
    flex-flow: row wrap;
    justify-content: center;
    gap: 5px;
  }
  .link {
    display: flex;
    flex-flow: row;
    gap: 30px;
  }
  * :global(.card) {
    padding: 30px;
  } */
</style>
