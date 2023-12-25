<script lang="ts">
  import { status as current_status } from "$lib/lib/websocket";
  import { current, settings_page } from "$lib/lib/UI";
  import { getCombined } from "$lib/lib/fetchers";
  import { notifications } from "$lib/lib/UI";

  // Top app bar
  const colors = ["orange", "green", "red"];
  const status = ["Connecting", "Online", "Error"];
</script>

<div id="rail" class="l m">
  <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <nav class="left" style="z-index: 99;">
    <a>
      <img class="circle" src="/favicon.svg" />
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
      on:click={() => {getCombined(["contacts"]); $current = "Contacts";}}
    >
      <i>Contacts</i>
      <span>Contacts</span>
    </a>
  </nav>
</div>

{#if $current != "Settings" || $settings_page == "main"}
  <div id="header">
    <header class="fixed">
      <nav>
        <p class="s" style="font-size: large; font-weight: 600;">{$current}</p>
        <div class="max" />
        <div>
          <div
            class="connection-status"
            style="background-color: {colors[$current_status]}"
          />
          <div class="tooltip bottom">{status[$current_status]}</div>
        </div>
        <!-- eslint-disable no-undef -->
        <!-- svelte-ignore missing-declaration -->
        <button
          class="circle transparent"
          on:click={() => ui("#dialog-notifications")}
        >
          <i>notifications</i>
          {#if $notifications.length != 0}
            <span class="badge circle">{$notifications.length}</span>
          {/if}
          <div class="tooltip bottom">Notifications</div>
        </button>
        <!-- eslint-enable no-undef -->
        <button class="l m circle transparent">
          <i>settings</i>
          <div class="tooltip bottom">Settings</div>
        </button>
      </nav>
    </header>
  </div>
  <div id="content-small-header" class="s">
    <slot />
  </div>
{:else}
  <div id="content-small" class="s">
    <slot />
  </div>
{/if}
<div id="content-large" class="l m">
  <slot />
</div>
<div id="footer" class="s">
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute a11y-no-static-element-interactions -->
  <nav class="bottom" style="z-index: 99;">
    <a
      class={$current == "Home" ? "active" : ""}
      on:click={() => ($current = "Home")}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={$current == "Contacts" ? "active" : ""}
      on:click={() => {getCombined(["contacts"]); $current = "Contacts";}}
    >
      <i>Contacts</i>
      <span>Contacts</span>
    </a>
    <a
      class={$current == "Settings" ? "active" : ""}
      on:click={() => {getCombined(["user"]); $settings_page = "main"; $current = "Settings";}}
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
  #content-small-header,
  #content-large {
    position: absolute;
    left: 0;
    width: 100%;
  }

  #content-small {
    top: 0;
    bottom: 80px;
    overflow: auto;
  }

  #content-small-header {
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
    border: 2px solid var(--on-background);
    height: 20px;
    width: 20px;
  }
</style>
