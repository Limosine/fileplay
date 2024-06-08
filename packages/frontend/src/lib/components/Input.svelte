<script lang="ts">
  import { input, rawFiles } from "$lib/lib/UI";
</script>

<!-- svelte-ignore component_name_lowercase -->
<input type="file" bind:this={$input} bind:files={$rawFiles} multiple />

<style>
  input {
    display: none;
  }
</style>
