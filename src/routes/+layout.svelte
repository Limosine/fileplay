<script lang="ts">
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import { registerSW } from "virtual:pwa-register";
  import { HTMLImageTags } from "virtual:pwa-assets";

  import TopAppBar from "../lib/components/TopAppBar.svelte";
  import Drawer from "../lib/components/Drawer.svelte";

  onMount(async () => {
    if (pwaInfo) {
      registerSW({
        // TODO handle queued update (show in notifications, update if inactive)
        onRegisteredSW(swScriptUrl: string, registration: ServiceWorkerRegistration) {
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
</script>

<svelte:head>
  {@html webManifest}
  {@html HTMLImageTags.join("\n")}
</svelte:head>

<TopAppBar />

<Drawer>
  <slot />
</Drawer>