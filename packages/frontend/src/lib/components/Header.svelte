<script lang="ts">
  import ui from "beercss";

  import { ui_object } from "$lib/lib/UI.svelte";
  import { capitalizeFirstLetter } from "$lib/lib/utils";
</script>

<div id="header">
  <header class="fixed">
    <nav>
      {#if ui_object.layout == "mobile"}
        <button class="circle transparent" onclick={() => ui("#dialog-menu")}>
          <i>menu</i>
          <div class="tooltip bottom">Menu</div>
        </button>

        <p style="font-size: large; font-weight: 600;">
          {capitalizeFirstLetter(
            ui_object.path.main == "send" || ui_object.path.main == "receive"
              ? "home"
              : ui_object.path.main,
          )}
        </p>
      {/if}

      <div class="max"></div>

      {#if ui_object.layout == "desktop"}
        <button
          class="circle {ui_object.path.main == 'settings'
            ? 'primary'
            : 'transparent'}"
          onclick={() =>
            ui_object.changePath({
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
