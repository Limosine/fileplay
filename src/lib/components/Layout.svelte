<script lang="ts">
  import { status as current_status } from "$lib/websocket";
  import { current } from "$lib/UI";

  // Top app bar
  const colors = ["yellow", "green", "red"];
  const status = ["Connecting", "Online", "Error"];
</script>

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
</style>