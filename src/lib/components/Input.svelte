<script lang="ts" context="module">
  import { writable } from "svelte/store";

  export const input = writable<HTMLInputElement>();
  export const files = writable<FileList>();
</script>

<input type="file" bind:this={$input} bind:files={$files} multiple />

<style>
  input {
    display: none;
  }
</style>
