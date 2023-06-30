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
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import type { Writable } from "svelte/store";
  import { addNotification } from "$lib/stores/Dialogs";

  let needRefresh: Writable<boolean>;

  onMount(async () => {
    // update service worker
    const messages = (await import("$lib/messages")).default_messages;

    if (pwaInfo) {
      const update = async (
        swScriptUrl: string,
        registration: ServiceWorkerRegistration
      ) => {
        console.log("checking for SW update");
        // check if sw is installing or navigator is offline
        if (!(!registration.installing && navigator)) return;
        if ("connection" in navigator && !navigator.onLine) return;

        await registration.update();
      };

      const { needRefresh, updateServiceWorker } = useRegisterSW({
        // TODO handle queued update (show in notifications, update if inactive)
        async onRegisteredSW(
          swScriptUrl: string,
          registration: ServiceWorkerRegistration | undefined
        ) {
          if (registration) {
            setInterval(
              async () => await update(swScriptUrl, registration),
              1000 * 60 * 60
            );
            await update(swScriptUrl, registration);
          }
        },
        onRegisterError(error: any) {
          console.error("SW registration error", error);
        },
      });

      messages.onnotificationclick("refresh", () => {
        console.log("refreshing");
        updateServiceWorker();
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
  $: if (needRefresh) {
    console.log("need refresh SW");
    addNotification({
      title: "New version available",
      body: "Click here to update",
      actions: [
        {
          title: "Update",
          action: "refresh",
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
          if (this.state === "granted" && localStorage.getItem("loggedIn"))
            await import("$lib/messages").then((m) => {
              m.default_messages.init();
              console.log("initialising messages on notification change");
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
