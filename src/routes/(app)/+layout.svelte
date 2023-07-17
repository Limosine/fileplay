<script lang="ts">
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";
  import "material-dynamic-colors";

  import { browser } from "$app/environment";
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import type { Writable } from "svelte/store";
  import { addNotification } from "$lib/stores/Dialogs";

  let needRefresh: Writable<boolean>;

  onMount(async () => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      ui("mode", "dark");
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
</svelte:head>

<slot />