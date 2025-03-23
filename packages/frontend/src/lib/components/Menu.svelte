<script lang="ts">
  import ui from "beercss";

  import { ui_object } from "$lib/lib/UI.svelte";
</script>

<!-- Corner radius? -->
<dialog
  class="left no-padding"
  id="dialog-menu"
  bind:this={ui_object.menuDialog}
>
  <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions missing-declaration -->
  <nav class="drawer">
    <header>
      <nav>
        <img class="circle" src="/favicon.svg" draggable="false" />
        <h6>Fileplay</h6>
      </nav>
    </header>
    <a
      class={ui_object.path.main == "send" || ui_object.path.main == "receive"
        ? "active"
        : ""}
      onclick={() => {
        ui_object.changePath({
          main: "send",
        });
        ui("#dialog-menu");
      }}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={ui_object.path.main == "contacts" ? "active" : ""}
      onclick={() => {
        ui_object.changePath({
          main: "contacts",
        });
        ui("#dialog-menu");
      }}
    >
      <i>contacts</i>
      <span>Contacts</span>
    </a>
    <a
      class={ui_object.path.main == "groups" ? "active" : ""}
      onclick={() => {
        ui_object.changePath({
          main: "groups",
        });
        ui("#dialog-menu");
      }}
    >
      <i>group</i>
      <span>Groups</span>
    </a>

    <div id="divider" class="divider"></div>

    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label>Settings</label>

    <a
      class={ui_object.path.main == "settings" ? "active" : ""}
      onclick={() => {
        ui_object.changePath({
          main: "settings",
        });
        ui("#dialog-menu");
      }}
    >
      <i>settings</i>
      <span>Settings</span>
    </a>
    <a>
      <i>help</i>
      <span>Information</span>
    </a>
  </nav>
</dialog>

<style>
  img {
    height: 40px;
    width: 40px;
  }

  #divider {
    margin: 8px 12px 0 12px;
    background-color: var(--on-surface);
  }
</style>
