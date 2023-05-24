<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import { registerSW } from "virtual:pwa-register";
  import { HTMLImageTags } from "virtual:pwa-assets";
  import { browser } from "$app/environment";

  import TopAppBar from "$lib/components/TopAppBar.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import SetupDialog from '$lib/dialogs/SetupDialog.svelte';

  let setup_open = true;
  
  onMount(async () => {
    // update service worker
    if (pwaInfo) {
      registerSW({
        // TODO handle queued update (show in notifications, update if inactive)
        onRegisteredSW(
          swScriptUrl: string,
          registration: ServiceWorkerRegistration
        ) {
          registration &&
            setInterval(async () => {
              // check if sw is installing or navigator is offline
              if (!(!registration.installing && navigator)) return;
              if ("connection" in navigator && !navigator.onLine) return;

              const resp = await fetch(swScriptUrl, {
                cache: "no-store",
                headers: {
                  cache: "no-store",
                  "cache-control": "no-cache",
                },
              });

              if (resp.status === 200) {
                await registration.update();
              }
            }, 1000 * 60 * 60);
        },
        onRegisterError(error: any) {
          console.error("SW registration error", error);
        },
      });
    }
  });

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";

  const preventDefault = (e: Event) => {
    if ($page.url.pathname == "/") {
      e.preventDefault();
    }
  }

  if (browser && !localStorage.getItem("setupDone")) {
    setup_open = true;
  }
</script>

<svelte:head>
  {@html webManifest}
  {@html HTMLImageTags.join("\n")}
</svelte:head>

<div on:touchmove={preventDefault}>
  <TopAppBar />

  <Drawer>
    <slot />
  </Drawer>

  <SetupDialog open={setup_open}></SetupDialog>
</div>