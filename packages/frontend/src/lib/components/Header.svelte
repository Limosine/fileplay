<script lang="ts">
  import { changePath, layout, path } from "$lib/lib/UI";
  import { capitalizeFirstLetter } from "$lib/lib/utils";
</script>

<div id="header">
  <header class="fixed">
    <nav>
      {#if $layout == "mobile"}
        <button class="circle transparent" onclick={() => ui("#dialog-menu")}>
          <i>menu</i>
          <div class="tooltip bottom">Menu</div>
        </button>

        <p style="font-size: large; font-weight: 600;">
          {capitalizeFirstLetter(
            $path.main == "send" || $path.main == "receive"
              ? "home"
              : $path.main,
          )}
        </p>
      {/if}

      <div class="max"></div>

      {#if $layout == "desktop"}
        <button
          class="circle {$path.main == 'settings' ? 'primary' : 'transparent'}"
          onclick={() =>
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

<style>
  #header {
    position: absolute;
    left: 0;
    width: 100%;
  }
</style>
