<script>
  // @ts-nocheck

  import { fly } from "svelte/transition";
  export let url = "";
</script>

{#key url}
  {#if url !== "/name" && url !== "/"}
    <div
      in:fly={{ duration: 600, opacity: 1, y: window.innerHeight }}
      out:fly={{ duration: 600, opacity: 1, y: window.innerHeight }}
    >
      <slot />
    </div>
  {:else}
    <slot />
  {/if}
{/key}

<style>
</style>
