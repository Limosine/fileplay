<script lang="ts">
  import { changePath, path } from "$lib/lib/UI";
</script>

<div id="footer">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_missing_attribute a11y_no_static_element_interactions -->
  <nav class="bottom" style="justify-content: space-around; z-index: 99;">
    <a
      class={$path.main == "send" ? "active" : ""}
      on:click={() =>
        changePath({
          main: "send",
        })}
    >
      <i>arrow_upward</i>
      <span>Send</span>
    </a>
    <a
      class={$path.main == "receive" ? "active" : ""}
      on:click={() =>
        changePath({
          main: "receive",
        })}
    >
      <i>arrow_downward</i>
      <span>Receive</span>
    </a>
  </nav>
</div>

<style>
  #footer {
    position: absolute;
    left: 0;
    width: 100%;
  }
</style>