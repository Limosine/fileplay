<script>
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import { HTMLImageTags } from "virtual:pwa-assets";
  import { each } from "svelte/internal";

  for(const tag of HTMLImageTags) {
    console.log(tag)
  }
  onMount(async () => {
    if (pwaInfo) {
      const { registerSW } = await import("virtual:pwa-register");
      registerSW({
        immediate: true,
        onRegistered(r) {
          r &&
            setInterval(() => {
              console.log("Checking for sw update");
              r.update();
            }, 20000);
          console.log(`SW Registered: ${r}`);
        },
        onRegisterError(error) {
          console.log("SW registration error", error);
        },
      });
    }
  });

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";
</script>

<svelte:head>
  {@html webManifest}
  {@html HTMLImageTags.join('\n')}
</svelte:head>

<main>
  <slot />
</main>
