<script lang="ts">
  import { notifications } from "$lib/lib/notifications";
  import { closeDialog, registration } from "$lib/lib/UI";
  import { settings } from "$lib/lib/settings.svelte";
</script>

<p style="font-size: large; margin-bottom: 10px;">Enable notifications?</p>

<div>Do you want to enable notifications?</div>

<nav class="right-align" style="padding: 10px 0 0 0;">
  <button
    class="transparent link"
    onclick={() => {
      settings.set("subscribedToPush", "false");
      closeDialog();
    }}>Deny</button
  >
  <button
    class="transparent link"
    onclick={() => {
      settings.set("subscribedToPush", "false");
      closeDialog(true);
      $notifications.create($registration);
    }}>Allow</button
  >
</nav>
