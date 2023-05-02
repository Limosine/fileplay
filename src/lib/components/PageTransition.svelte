<script lang="ts">
  import { goto } from "$app/navigation";
  import { fly } from "svelte/transition";
  export let url = "";

  var inputs = ["input", "select", "button", "textarea"];

  const handleKeydown = (event: any) => {
    var activeElement = document.activeElement;
    if (event.keyCode == 27) {
      if (
        activeElement &&
        inputs.indexOf(activeElement.tagName.toLowerCase()) !== -1
      ) {
        (document.activeElement as HTMLElement).blur();
      } else {
        goto("/");
      }
    }
  };
</script>

<div class="transition-outer">
  {#key url}
    {#if url !== "/name" && url !== "/"}
      <div
        class="transition-inner"
        in:fly={{ duration: 700, opacity: 1, y: window.innerHeight }}
        out:fly={{ duration: 700, opacity: 1, y: window.innerHeight }}
      >
        <slot />
      </div>
    {:else}
      <slot />
    {/if}
  {/key}
</div>

<svelte:window on:keydown={handleKeydown} />

<style>
  .transition-outer {
    display: grid;
    grid-template: 1fr 1fr;
  }

  .transition-inner {
    grid-row: 1;
    grid-column: 1;
  }
</style>
