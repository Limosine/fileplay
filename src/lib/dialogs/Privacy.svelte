<script lang="ts">
  import { privacyDialog, registration } from "$lib/lib/UI";

  const click = () => {
    localStorage.setItem("privacyAccepted", "true");
    ui("#dialog-privacy");

    if (
      $registration !== undefined &&
      localStorage.getItem("subscribedToPush") === null
    )
      ui("#dialog-request");
  };
</script>

<dialog id="dialog-privacy" bind:this={$privacyDialog}>
  <h6>Welcome to Fileplay</h6>

  <div id="properties">
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

  <nav class="right-align" style="padding: 10px 0 0 0;">
    <button on:click={click}>Let's share</button>
  </nav>
</dialog>

<style>
  .icon {
    margin-right: 15px;
  }

  #properties {
    display: flex;
    flex-flow: column;
    gap: 10px;
  }
</style>
