<script lang="ts">
  import { tweened } from "svelte/motion";
  import { elasticInOut } from "svelte/easing";
  import LinearProgress from "@smui/linear-progress";
  import Backdrop from "$lib/components/Backdrop.svelte";

  import Viewblock from "./Viewblock.svelte";
  import { onDestroy, onMount } from "svelte";
  import pageLoadCount from "$lib/stores/PageLoadStore";

  let visible = true;

  let loadCount = 0;

  // loading state
  let loading_state = 0;
  const progress = tweened(0, {
    duration: 400,
    easing: elasticInOut,
  });
  const loading_states: [number, string][] = [
    [0.3, "checking network"],
    [0.7, "checking service worker"],
  ];
  $: progress.set(
    0 <= loading_state && loading_state < loading_states.length
      ? loading_states[loading_state][0]
      : 0
  );

  function toggleVisible() {
    visible = !visible;
  }

  function subscribe() {
    pageLoadCount.subscribe((value) => {
      loadCount = value;
    });
  }

  onMount(() => {
    subscribe();

    if (loadCount == 0) {
      pageLoadCount.update((n) => n + 1);
    } else {
      visible = false;
    }
  });

  onDestroy(() => {
    subscribe();
  });
</script>

{#if visible}
  <div class="main">
    {#if loading_state < loading_states.length}
      <!-- <Viewblock> -->

      <div>
        <LinearProgress progress={$progress} />
        <p>
          {0 <= loading_state && loading_state < loading_states.length
            ? loading_states[loading_state][1]
            : ""}
        </p>
        <button
          on:click={() => {
            loading_state = loading_state + 1;
            if (loading_state >= loading_states.length) {
              toggleVisible();
            }
          }}>hi there</button
        >
      </div>
      <!-- </Viewblock> -->
      <Backdrop />
    {/if}
  </div>
{/if}

<style>
  .main {
    position: absolute;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-content: center;
  }
</style>
