<script>
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import { registerSW } from "virtual:pwa-register";
  import { HTMLImageTags } from "virtual:pwa-assets";

  onMount(async () => {
    if (pwaInfo) {
      registerSW({  // TODO handle queued update (show in notifications, update if inactive)
        onRegisteredSW(swUrl, r) {
          r &&
            setInterval(async () => {
              // check if sw is installing or navigator is offline
              if (!(!r.installing && navigator)) return;
              if ("connection" in navigator && !navigator.onLine) return;

              const resp = await fetch(swUrl, {
                cache: "no-store",
                headers: {
                  cache: "no-store",
                  "cache-control": "no-cache",
                },
              });

              if (resp.status === 200) {
                await r.update();
              }
            }, 1000 * 60 * 60);
        },
        onRegisterError(error) {
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

<main>
  <slot />
</main>
