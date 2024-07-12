<script lang="ts">
  import { closeDialog } from "$lib/lib/UI";
</script>

<p style="font-size: large;">Confirm deletion</p>

<nav class="right-align" style="padding: 10px 0 0 0;">
  <button class="transparent link" onclick={() => closeDialog()}>
    Cancel
  </button>
  <button class="transparent link" onclick={() => closeDialog(true)}>
    Delete
  </button>
</nav>
