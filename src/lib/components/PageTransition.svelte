<script>
  // @ts-nocheck

  import { fly } from "svelte/transition";
  export let url = "";
  const visibleOverflow = (e)=> {
    e.target.style.overflow = "visible";
    console.log("intro start")
  }

  const hiddenOverflow = (e)=> {
    e.target.style.overflow = "hidden";
    console.log("outro start")
  }

  const unsetOverflow = (e)=> {
    e.target.style.overflow = "unset";
    console.log("outro end")
  }

</script>

{#key url}
  {#if url !== "/name" && url !== "/"}
    <div
      in:fly={{ duration: 400, opacity: 1, y: window.innerHeight }}
      out:fly={{ duration: 400, opacity: 1, y: window.innerHeight }}
      on:introend={visibleOverflow}
      on:outrostart={hiddenOverflow}
      on:outroend={unsetOverflow}
      >
      <slot />
    </div>
  {:else}
    <slot />
  {/if}
{/key}

<style>
</style>
