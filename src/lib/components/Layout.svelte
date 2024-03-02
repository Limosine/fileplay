<script lang="ts">
  import { changePath, notifications, path } from "$lib/lib/UI";
  import { capitalizeFirstLetter } from "$lib/lib/utils";
  import { authorizeGuestSender } from "$lib/sharing/main";
</script>

<div id="rail" class="l m">
  <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <nav class="left" style="z-index: 99;">
    <a>
      <img class="circle" src="/favicon.svg" />
    </a>
    <a
      class={$path.main == "home" ? "active" : ""}
      on:click={() => changePath({ main: "home" })}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={$path.main == "contacts" ? "active" : ""}
      on:click={() => changePath({ main: "contacts" })}
    >
      <i>Contacts</i>
      <span>Contacts</span>
    </a>
  </nav>
</div>

{#if $path.main != "settings" || !("sub" in $path)}
  <div id="header">
    <header class="fixed">
      <nav>
        <p class="s" style="font-size: large; font-weight: 600;">
          {capitalizeFirstLetter($path.main)}
        </p>
        <div class="max" />
        <!-- eslint-disable no-undef -->
        <!-- svelte-ignore missing-declaration -->
        <button
          class="circle transparent"
          on:click={() => {
            authorizeGuestSender();
            ui("#dialog-qrcode");
          }}
        >
          <i>qr_code_2</i>
          <div class="tooltip bottom">Guest QR code</div>
        </button>
        <!-- svelte-ignore missing-declaration -->
        <button
          class="circle transparent"
          on:click={() => ui("#dialog-notifications")}
        >
          {#if $notifications.length != 0}
            <p class="badge circle">{$notifications.length}</p>
          {/if}
          <i>notifications</i>
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
      class={$path.main == "home" ? "active" : ""}
      on:click={() =>
        changePath({
          main: "home",
        })}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={$path.main == "contacts" ? "active" : ""}
      on:click={() =>
        changePath({
          main: "contacts",
        })}
    >
      <i>Contacts</i>
      <span>Contacts</span>
    </a>
    <a
      class={$path.main == "settings" ? "active" : ""}
      on:click={() =>
        changePath({
          main: "settings",
        })}
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
</style>
