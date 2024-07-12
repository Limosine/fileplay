<script lang="ts">
  import { changePath, path } from "$lib/lib/UI";
  import { manager } from "$lib/sharing/manager.svelte";

  const outgoingLength = $derived(
    manager.outgoing.filter((o) =>
      o.recipients.some((r) => r.state == "requesting" || r.state == "sending"),
    ).length,
  );
  const incomingLength = $derived(
    manager.incoming.filter((i) => i.state == "infos" || i.state == "receiving")
      .length,
  );
</script>

<div id="footer">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_missing_attribute, a11y_no_static_element_interactions -->
  <nav class="bottom" style="justify-content: space-around; z-index: 99;">
    <a
      class={$path.main == "send" ? "active" : ""}
      onclick={() =>
        changePath({
          main: "send",
        })}
    >
      <i>arrow_upward</i>
      {#if outgoingLength > 0}
        <div class="badge">{outgoingLength}</div>
      {/if}
      <span>Send</span>
    </a>
    <a
      class={$path.main == "receive" ? "active" : ""}
      onclick={() =>
        changePath({
          main: "receive",
        })}
    >
      <i>arrow_downward</i>
      {#if incomingLength > 0}
        <div class="badge">{incomingLength}</div>
      {/if}
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
