<script lang="ts">
  import {
    changePath,
    layout,
    notifications,
    openDialog,
    path,
  } from "$lib/lib/UI";
  import { capitalizeFirstLetter } from "$lib/lib/utils";
  import { authorizeGuestSender } from "$lib/sharing/main";
</script>

{#if $layout == "desktop"}
  <div id="rail">
    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <nav
      class="left"
      style="z-index: 99; background-color: var(--surface-container);"
    >
      <a>
        <img class="circle" src="/favicon.svg" draggable="false" />
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
{/if}

{#if $layout == "desktop" || $path.main != "settings" || !("sub" in $path)}
  <div id="header">
    <header class="fixed">
      <nav>
        {#if $layout == "mobile"}
          <p style="font-size: large; font-weight: 600;">
            {capitalizeFirstLetter($path.main)}
          </p>
        {/if}
        <div class="max" />
        <!-- eslint-disable no-undef -->
        <!-- svelte-ignore missing-declaration -->
        <button
          class="circle transparent"
          on:click={() => {
            authorizeGuestSender();
            openDialog("qrcode");
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
            <div class="badge">{$notifications.length}</div>
          {/if}
          <i>notifications</i>
          <div class="tooltip bottom">Notifications</div>
        </button>
        {#if $layout == "desktop"}
          <!-- eslint-enable no-undef -->
          <button
            class="circle transparent"
            on:click={() =>
              changePath({
                main: "settings",
              })}
          >
            <i>settings</i>
            <div class="tooltip bottom">Settings</div>
          </button>
        {/if}
      </nav>
    </header>
  </div>
  {#if $layout == "mobile"}
    <div id="content-small-header">
      <slot />
    </div>
  {/if}
{:else if $layout == "mobile"}
  <div id="content-small">
    <slot />
  </div>
{/if}
{#if $layout == "desktop"}
  <div id="content-large">
    <slot />
  </div>
{:else}
  <div id="footer">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-missing-attribute a11y-no-static-element-interactions -->
    <nav class="bottom" style="justify-content: space-around; z-index: 99;">
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
{/if}

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
