<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import { registerSW } from "virtual:pwa-register";
  import { HTMLImageTags } from "virtual:pwa-assets";

  import TopAppBar from "$lib/components/TopAppBar.svelte";
  import Drawer from "$lib/components/ContactDrawer.svelte";
  import N_Drawer from "$lib/components/NotificationDrawer.svelte";

  import "$lib/../theme/typography.scss";
  import webpush from "web-push";
  import { notifications } from "$lib/stores/Dialogs";

  onMount(async () => {
    webpush.setVapidDetails(
      "https://app.fileplay.me",
      import.meta.env.PUBLIC_VAPID_KEY,
      import.meta.env.PRIVATE_VAPID_KEY
    );
    $notifications.push({
      title: "Huhu",
      content: "Contentanasfanlkfsan ajbfs askjfb",
    });
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
                if (Notification.permission !== "granted") {
                  Notification.requestPermission(async (perm) => {
                    if (perm === "granted") {
                      const subscription =
                        await registration.pushManager.subscribe({
                          userVisibleOnly: true,
                          applicationServerKey: import.meta.env
                            .PUBLIC_VAPID_KEY,
                        });

                      await fetch("api/notifications/updateSubscription", {
                        method: "POST",
                        body: JSON.stringify(subscription),
                        headers: {
                          "content-type": "application/json",
                        },
                      });
                    }
                  });
                }
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
  };
</script>

<svelte:head>
  {@html webManifest}
  {@html HTMLImageTags.join("\n")}
</svelte:head>

<div on:touchmove={preventDefault}>
  <TopAppBar />

  <N_Drawer>
    <Drawer>
      <slot />
    </Drawer>
  </N_Drawer>
</div>
