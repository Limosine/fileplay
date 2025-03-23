<script lang="ts">
  import { notifications } from "$lib/lib/notifications";
  import { ui_object } from "$lib/lib/UI.svelte";
  import { settings } from "$lib/lib/settings.svelte";
</script>

<p style="font-size: large; margin-bottom: 10px;">Enable notifications?</p>

<div>Do you want to enable notifications?</div>

<nav class="right-align" style="padding: 10px 0 0 0;">
  <button
    class="transparent link"
    onclick={() => {
      settings.set("subscribedToPush", "false");
      ui_object.closeDialog();
    }}>Deny</button
  >
  <button
    class="transparent link"
    onclick={() => {
      settings.set("subscribedToPush", "false");
      ui_object.closeDialog(true);
      if (ui_object.registration !== undefined)
        $notifications.create(ui_object.registration);
    }}>Allow</button
  >
</nav>
