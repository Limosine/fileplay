<script lang="ts">
  import { notifications } from "$lib/lib/notifications";
  import { closeDialog, registration } from "$lib/lib/UI";
</script>

<p style="font-size: large; margin-bottom: 10px;">Enable notifications?</p>

<div>Do you want to enable notifications?</div>

<nav class="right-align" style="padding: 10px 0 0 0;">
  <!-- eslint-disable no-undef -->
  <!-- svelte-ignore missing-declaration -->
  <button
    class="transparent link"
    on:click={() => {
      localStorage.setItem("subscribedToPush", "false");
      closeDialog();
    }}>Deny</button
  >
  <!-- svelte-ignore missing-declaration -->
  <button
    class="transparent link"
    on:click={async () => {
      localStorage.setItem("subscribedToPush", "false");
      closeDialog(true);
      notifications().create($registration);
    }}>Allow</button
  >
  <!-- eslint-enable no-undef -->
</nav>
