<script lang="ts">
  import { ui_object } from "$lib/lib/UI.svelte";
</script>

<div id="rail">
  <!-- svelte-ignore a11y_missing_attribute, a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <nav
    class="left"
    style="z-index: 99; background-color: var(--surface-container);"
  >
    <a>
      <img class="circle" src="/favicon.svg" draggable="false" alt="Fileplay" />
    </a>

    <a
      class={ui_object.path.main == "send" || ui_object.path.main == "receive"
        ? "active"
        : ""}
      onclick={() =>
        ui_object.changePath({
          main: "send",
        })}
    >
      <i>home</i>
      <span>Home</span>
    </a>
    <a
      class={ui_object.path.main == "contacts" ? "active" : ""}
      onclick={() =>
        ui_object.changePath({
          main: "contacts",
        })}
    >
      <i>contacts</i>
      <span>Contacts</span>
    </a>
    <a
      class={ui_object.path.main == "groups" ? "active" : ""}
      onclick={() =>
        ui_object.changePath({
          main: "groups",
        })}
    >
      <i>group</i>
      <span>Groups</span>
    </a>
  </nav>
</div>

<style>
  #rail {
    position: absolute;
    left: 0;
    width: 100%;
  }
</style>
