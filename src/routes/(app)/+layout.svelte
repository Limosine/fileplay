<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import { writable, type Readable, type Writable } from "svelte/store";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";
  import "material-dynamic-colors";

  import logo from "$lib/assets/Fileplay.png";
  import { addNotification } from "$lib/stores/Dialogs";
  import { status } from "$lib/websocket";
  import { setup as pgp_setup } from "$lib/openpgp";

  import Layout from "$lib/components/Layout.svelte";
  import Notifications from "$lib/dialogs/Notifications.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import AddContactDialog from "$lib/dialogs/AddContactDialog.svelte";

  let peer_open = writable(false);
  let socketStore: Readable<any>;
  let unsubscribeSocketStore = () => {};

  let needRefresh: Writable<boolean>;
  let loading = true;

  onMount(async () => {
    if (localStorage.getItem("loggedIn")) {
      peer_open = (await import("$lib/peerjs/common")).peer_open;
      const { openPeer, listen } = await import("$lib/peerjs/main");

      pgp_setup();
      openPeer();
      listen();

      socketStore = (await import("$lib/websocket")).socketStore;
      unsubscribeSocketStore = socketStore.subscribe(() => {});
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
          registration: ServiceWorkerRegistration | undefined
        ) {
          if (registration) {
            setInterval(
              async () => await update(registration),
              30 * 60 * 1000 // 5 mins secs (for debugging)
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

    console.log("registered reset_client handler on client side");
  });

  onDestroy(() => {
    if (socketStore) unsubscribeSocketStore();
  });

  $: {
    if (browser) {
      loading =
        !$peer_open || !localStorage.getItem("loggedIn") || $status != "1";
    }
  }

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";
  $: if ($needRefresh) {
    console.log("need refresh SW");
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
  {@html webManifest}
  <title>Fileplay</title>
</svelte:head>

<div id="logo">
  <img id="logo-image" src={logo} alt="Fileplay" />
</div>
<div id="start">
  <div class="center-align">
    <!-- svelte-ignore a11y-missing-attribute a11y-missing-content -->
    <a class="loader medium" />
  </div>
</div>

{#if !loading}
  <!-- Dialogs -->
  <Edit />
  <AddContactDialog />

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
