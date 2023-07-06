<script lang="ts">
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";

  import TopAppBar from "$lib/components/TopAppBar.svelte";
  import Drawer from "$lib/components/Drawer.svelte";

  import "$lib/../theme/typography.scss";
  import { browser } from "$app/environment";
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import type { Writable } from "svelte/store";
  import { addNotification } from "$lib/stores/Dialogs";

  let needRefresh: Writable<boolean>;

  onMount(async () => {
    // update service worker
    const messages = (await import("$lib/messages")).default_messages;

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

      messages.onnotificationclick("update_sw", () => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.waiting?.postMessage({ type: "skip_waiting" });
          window.location.reload();
        });
      });
    }

    messages.onsystemmessage("reset_client", () => {
      console.log("resetting client message received");
      localStorage.removeItem("loggedIn");
      window.location.reload();
    });
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

  if (browser) {
    // resubscribe push notifications on permission change
    navigator.permissions
      .query({ name: "notifications" })
      .then(function (permission) {
        // Initial status is available at permission.state
        permission.onchange = async function () {
          if (localStorage.getItem("loggedIn"))
            await import("$lib/messages").then(async (m) => {
              await m.default_messages.init();
              console.log("initializing messages on notification change");
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

<TopAppBar />

<Drawer>
  <slot />
</Drawer>