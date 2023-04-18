<script lang="ts">
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  let showLoadingBar = false;
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  const progress = tweened(0, {
    duration: 3500, // The time it takes to move between values
    easing: cubicOut, // The easing function to use
  });

  beforeNavigate(() => {
    showLoadingBar = true;
    progress.set(0.7);
  });

  afterNavigate(() => {
    progress.set(1, { duration: 500 });

    setTimeout(() => {
      // Hide and reset to zero after it finishes animating
      showLoadingBar = false;
      progress.set(0, { duration: 0 });
    }, 600);
  });
</script>

{#if showLoadingBar}
  <div class="progress-bar">
    <div class="progress-sliver" style="width: {$progress * 100}%" />
  </div>
{/if}

<style>
  .progress-bar {
    position: fixed;
    will-change: transform; /* Helps with position fixed supposedly */
    top: 0;
    width: 100%;
    height: 0.5ch;
    background: #b8b8b8;
    z-index: 2000;
  }

  .progress-sliver {
    background: rgb(0, 60, 103);
    height: 100%;
  }
</style>
