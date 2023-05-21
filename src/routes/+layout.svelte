<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from "svelte";
  import { pwaInfo } from "virtual:pwa-info";
  import { registerSW } from "virtual:pwa-register";
  import { HTMLImageTags } from "virtual:pwa-assets";

  import TopAppBar, { Row, Section, Title } from "@smui/top-app-bar";
  import { AutoAdjust } from "@smui/top-app-bar";
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import IconButton from "@smui/icon-button";
  import { browser } from "$app/environment";
  import { setClient } from "svelte-apollo";
  import { createApolloClient } from "$lib/db";
  import { state } from "$lib/stores/state";

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

  // check/setup database client connection
  if (browser) {
    if (!$state.isLoggedIn) {
      const client = createApolloClient(localStorage.getItem("jwt"));
      if (!client) {
        if (window.location.pathname !== "/") {
          console.log("redirecting to /");
          // might wanna disable this unless it works
          window.location.pathname = "/";
        }
      } else {
        console.log("creating apollo client");
        $state.isLoggedIn = true;
        setClient(client);
      }
    }
  }

  let topAppBar: TopAppBar;
  const colors = ["green", "yellow", "red"];
  const status = ["Online", "Connecting", "Offline"];
  let current_status = 0;
  let webManifest: string;

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : "";

  const preventDefault = (e: Event) => {
    if ($page.url.pathname == "/") {
      e.preventDefault();
    }
  }
</script>

<svelte:head>
  {@html webManifest}
  {@html HTMLImageTags.join("\n")}
</svelte:head>

<TopAppBar variant="fixed" bind:this={topAppBar}>
  <Row>
    <Section>
      <Title>Fileplay</Title>
    </Section>
    <Section align="end" toolbar>
      <Wrapper>
        <div>
          <div
            class="connection-status"
            style="background-color: {colors[current_status]}"
          />
        </div>
        <Tooltip>Connection status: {status[current_status]}</Tooltip>
      </Wrapper>

      <Wrapper>
        <IconButton class="material-icons" aria-label="Show notifications"
          >notifications</IconButton
        >
        <Tooltip>Show notifications</Tooltip>
      </Wrapper>

      <Wrapper>
        <IconButton class="material-icons" aria-label="Account page"
          >account_circle</IconButton
        >
        <Tooltip>Account page</Tooltip>
      </Wrapper>

      <Wrapper>
        <IconButton class="material-icons" aria-label="Settings Page"
          >settings</IconButton
        >
        <Tooltip>Settings Page</Tooltip>
      </Wrapper>
    </Section>
  </Row>
</TopAppBar>
<AutoAdjust {topAppBar}>
  <slot />
</AutoAdjust>

<style>
  .connection-status {
    margin: 14px;
    border-radius: 50%;
    border: 3px solid white;
    height: 12px;
    width: 12px;
  }
</style>
