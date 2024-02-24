<script lang="ts">
  import { privacyDialog } from "$lib/lib/UI";
</script>

<dialog id="dialog-privacy" bind:this={$privacyDialog}>
  <h4>Welcome to Fileplay</h4>

  <div class="column">
    <div class="row">
      <i class="icon large">encrypted</i>
      <p>End-to-end encryption</p>
    </div>
    <div class="row">
      <i class="icon large">security</i>
      <p>Only necessary data is stored</p>
    </div>
    <div class="row">
      <i class="icon large">p2p</i>
      <p>Peer-to-Peer communication</p>
    </div>
  </div>

  <div style="margin-bottom: 10px;"></div>
  <!-- svelte-ignore missing-declaration -->
  <button
    style="margin-left: -3px;"
    on:click={() => {
      localStorage.setItem("privacyAccepted", "true");
      ui("#dialog-privacy");
    }}>Let's share</button
  >
</dialog>

<style>
  .icon {
    margin-right: 15px;
  }
</style>
