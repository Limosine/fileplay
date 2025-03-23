<script lang="ts">
  import { ui_object } from "$lib/lib/UI.svelte";

  $effect(() => {
    if (ui_object.rawFiles !== undefined) {
      ui_object.syncFiles();
    }
  });
</script>

<!-- svelte-ignore component_name_lowercase -->
<input
  type="file"
  bind:this={ui_object.input}
  bind:files={ui_object.rawFiles}
  multiple
/>

<style>
  input {
    display: none;
  }
</style>
