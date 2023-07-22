<script lang="ts">
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";

  import "beercss";
  import "material-dynamic-colors";

  import logo from "$lib/assets/Fileplay.png";

  import { browser } from "$app/environment";
  import { useRegisterSW } from "virtual:pwa-register/svelte";
  import type { Writable } from "svelte/store";
  import { addNotification } from "$lib/stores/Dialogs";
  import Layout from "$lib/components/Layout.svelte";
  import Notifications from "$lib/dialogs/Notifications.svelte";
  import SetupDialog from "$lib/dialogs/Setup.svelte";
  import Setup from "$lib/dialogs/Setup.svelte";

  let needRefresh: Writable<boolean>;

  onMount(async () => {
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
  <title>Fileplay</title>
</svelte:head>


<div id="logo">
  <img id="logo-image" src={logo} alt="Fileplay" />
</div>
<div id="start">
  <div class="center-align">
    <!-- svelte-ignore a11y-missing-attribute a11y-missing-content -->
    <a class="loader medium" />
  </div>
</div>

{#if browser && localStorage.getItem("loggedIn")}
  <div id="overlay"/>

  <Notifications />
  <Setup />

  <Layout>
    <slot />
  </Layout>
{/if}

<style>
  #overlay {
    position: absolute;
    z-index: 0;
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  #logo {
    position: absolute;
    z-index: -1;
    width: 100%;
    height: 50%;
    top: 0;

    display: flex;
    justify-content: center;
    align-items: center;
  }

  #start {
    position: absolute;
    z-index: -1;
    width: 100%;
    height: 50%;
    bottom: 0;
  }

  img#logo-image {
    width: 300px;
    height: auto;
  }

  /* p.small {
    line-height: 0.2;
  }
  .beside {
    display: flex;
    flex-basis: auto;
    flex-flow: row wrap;
    justify-content: center;
    gap: 5px;
  }
  .link {
    display: flex;
    flex-flow: row;
    gap: 30px;
  }
  * :global(.card) {
    padding: 30px;
  } */
</style>
