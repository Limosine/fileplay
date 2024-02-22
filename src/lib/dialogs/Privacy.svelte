<script lang="ts">
  import { privacyDialog } from "$lib/lib/UI";
</script>

<dialog id="dialog-privacy" bind:this={$privacyDialog}>
  <h4>Privacy and Safety</h4>
  <hr style="margin-bottom: 10px;" />

  <div class="flex-container">
    <div class="left">The transmitted data is end-to-end encrypted</div>
    <div class="right">
      <i> lock </i>
    </div>
  </div>

  <div style="margin-bottom: 10px;"></div>
  <button
    style="margin-left: -3px;"
    on:click={() => {
      localStorage.setItem("privacyAccepted", "true");
      ui("#dialog-privacy");
    }}>Okay, I got it!</button
  >
</dialog>

<style>
  .flex-container {
    display: flex;
  }

  .right {
    margin-top: -3px;
    margin-left: 3px;
  }
</style>
