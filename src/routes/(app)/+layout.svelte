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

    addNotification({title: "Test", body: "Test notification body"});
    addNotification({title: "Test", body: "Test notification body"});
    addNotification({title: "Test", body: "Test notification body"});
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

  import {
    settings_open,
    active,
    drawer,
    drawer_open,
    notifications,
    deleteNotification,
    type INotification,
  } from "$lib/stores/Dialogs";
  import { status as current_status } from "$lib/websocket";
  import { current } from "$lib/UI";


  async function notificationPermission() {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        return true;
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") return true;
      }
    }
    return false;
  }

  async function sendNotification(text: string) {
    if (await notificationPermission()) {
      const notification = new Notification(text);
    }
  }

  // topbar
  const colors = ["yellow", "green", "red"];
  const status = ["Connecting", "Online", "Error"];

  // notifications
  async function handleNotificationClick(n: INotification, action: string) {
    deleteNotification(n.tag);
    if (action == "close") return null;
  }
</script>

<svelte:head>
  {@html webManifest}
  <title>Fileplay</title>
</svelte:head>

<dialog class="right" id="dialog-notifications" style="z-index: 102;">
  <nav>
    <!-- svelte-ignore missing-declaration -->
    <button
      on:click={() => ui("#dialog-notifications")}
      class="transparent circle large"
    >
      <i>close</i>
    </button>
    <h5 class="max">Notifications</h5>
  </nav>
  <div class="section-contacts">
    {#each $notifications as n}
      <article class="border">
        <div class="row">
          <h6>{n.title}</h6>
          <p>{n.body}</p>
          <nav>
            {#each n.actions ?? [] as action}
              <button on:click={() => handleNotificationClick(n, action.action)}
                >{action.title}</button
              >
            {/each}
            <button on:click={() => deleteNotification(n.tag)}>Close</button>
          </nav>
        </div>
      </article>
    {/each}
  </div>
</dialog>

<div id="rail" class="l m">
  <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
  <nav class="left">
    <a>
      <img class="circle" src="/favicon.png" />
    </a>
    <a
      class={$current == "Home" ? "active" : ""}
      on:click={() => ($current = "Home")}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={$current == "Contacts" ? "active" : ""}
      on:click={() => ($current = "Contacts")}
    >
      <i>Contacts</i>
      <span>Contacts</span>
    </a>
  </nav>
</div>

<div id="header">
  <header class="fill fixed">
    <nav>
      <p class="large-text">{$current}</p>
      <div class="max" />
      <div>
        <div
          class="connection-status"
          style="background-color: {colors[$current_status]}"
        />
        <div class="tooltip bottom">{status[$current_status]}</div>
      </div>
      <!-- svelte-ignore missing-declaration -->
      <button
        class="circle transparent"
        on:click={() => ui("#dialog-notifications")}
      >
        <i>notifications</i>
        <div class="tooltip bottom">Notifications</div>
      </button>
      <button class="l m circle transparent">
        <i>settings</i>
        <div class="tooltip bottom">Settings</div>
      </button>
    </nav>
  </header>
</div>
<div id="content-small" class="s">
  <slot />
</div>
<div id="content-large" class="l m">
  <slot />
</div>
<div id="footer" class="s">
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute -->
  <nav class="bottom">
    <a
      class={$current == "Home" ? "active" : ""}
      on:click={() => ($current = "Home")}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={$current == "Contacts" ? "active" : ""}
      on:click={() => ($current = "Contacts")}
    >
      <i>Contacts</i>
      <span>Contacts</span>
    </a>
    <a
      class={$current == "Settings" ? "active" : ""}
      on:click={() => ($current = "Settings")}
    >
      <i>settings</i>
      <span>Settings</span>
    </a>
  </nav>
</div>

<style>
  #header,
  #rail,
  #footer,
  #content-small,
  #content-large {
    position: absolute;
    left: 0;
    width: 100%;
  }
  #content-small {
    top: 64px;
    bottom: 80px;
    overflow: auto;
  }
  #content-large {
    height: calc(100% - 64px);
    width: calc(100% - 80px);
    top: 64px;
    left: 80px;
    overflow: auto;
  }

  .connection-status {
    margin: 10px;
    border-radius: 50%;
    border: 3px solid #cac4d0;
    height: 20px;
    width: 20px;
  }

  /* .box > .section > .section-contacts {
    display: flex;
    flex-flow: column;
    gap: 5px;
    padding: 7px;
  }
  
  p.small {
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
