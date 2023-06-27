<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import { registerSW } from "virtual:pwa-register";

  import TopAppBar from "$lib/components/TopAppBar.svelte";
  import Drawer from "$lib/components/ContactDrawer.svelte";
  import N_Drawer from "$lib/components/NotificationDrawer.svelte";

  import "$lib/../theme/typography.scss";
  import { browser } from "$app/environment";

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
                console.log("SW updated");
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

  if (browser) {
    // resubscribe push notifications on permission change
    navigator.permissions
      .query({ name: "notifications" })
      .then(function (permission) {
        // Initial status is available at permission.state
        permission.onchange = function () {
          if (this.state === "granted" && localStorage.getItem("loggedIn"))
            navigator.serviceWorker.ready.then((registration) => {
              registration.active?.postMessage({ type: "register_push" });
            });
        };
      });

    // check if service worker is running and handling push
    // yes --> assume it is handling push notifications and the keepalive
    // no --> register websocket, send keepalive
  }
</script>

<svelte:head>
  {@html webManifest}
</svelte:head>

<div on:touchmove|preventDefault>
  <TopAppBar />

  <N_Drawer>
    <Drawer>
      <slot />
    </Drawer>
  </N_Drawer>
</div>
