<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import { writable, type Writable } from "svelte/store";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";

  import logo from "$lib/assets/Fileplay.svg";
  import { addNotification } from "$lib/lib/UI";
  import { createWebSocket, status } from "$lib/lib/websocket";
  import { setup as pgp_setup } from "$lib/lib/openpgp";

  import Layout from "$lib/components/Layout.svelte";
  import Notifications from "$lib/dialogs/Notifications.svelte";
  import Edit from "$lib/dialogs/Edit.svelte";
  import AddContact from "$lib/dialogs/AddContact.svelte";

  let peer_open = writable(false);

  let needRefresh: Writable<boolean>;
  let loading = 0;

  const getClass = (loading: number) => {
    if (loading === 2) {
      return "disappear";
    } else if (loading === 3) {
      return "hidden";
    } else return "";
  };

  onMount(async () => {
    if ($page.url.hostname != "localhost" && localStorage.getItem("loggedIn")) {
      pgp_setup();

      peer_open = (await import("$lib/peerjs/common")).peer_open;
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
      if (loading !== 3) {
        loading = ($peer_open === true ? 1 : 0) + ($status === "1" ? 1 : 0);
        if (loading === 2) {
          setTimeout(() => {
            loading = 3;
          }, 1100);
        }
      }
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

<div id="logo" class={getClass(loading)}>
  <img id="logo-image" src={logo} alt="Fileplay" />
</div>
{#if loading !== -1}
  <div id="start" class={getClass(loading)}>
    <div id="status">
      <progress id="status" value="{loading}" max="2" style="width: 50%;" />
    </div>

    <div id="status" class="large-text" style="margin-top: 10px;">
      {#if loading === 0}
        <p>Connecting to WebSocket...</p>
      {:else if loading === 1}
        <p>Establishing PeerJS connection...</p>
      {:else}
        <p>Initialization completed.</p>
      {/if}
    </div>
  </div>
{/if}

<div id="overlay" class={getClass(loading)} />

{#if loading === 2 || loading === 3}
  <!-- Dialogs -->
  <Edit />
  <AddContact />

  <Notifications />

  <Layout>
    <slot />
  </Layout>
{/if}

<style>

  .disappear {
    opacity: 0;
    transition:opacity 1s;
  }

  .hidden {
    display: none;
    opacity: 0;
    z-index: -1;
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

  #start {
    position: absolute;
    z-index: 10001;
    width: 100%;
    height: 25%;
    bottom: 0;
  }

  #status {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  img#logo-image {
    width: 300px;
    height: auto;
  }
</style>
