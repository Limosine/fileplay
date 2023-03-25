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
    [1, "Eating cookies"],
  ];
  $: progress.set(
    0 <= loading_state && loading_state < loading_states.length
      ? loading_states[loading_state][0]
      : 0
  );

  function toggleVisible() {
    visible = false;
  }

  function subscribe() {
    pageLoadCount.subscribe((value) => {
      loadCount = value;
    });
  }

  onMount(() => {
    subscribe();

    setTimeout(() => {
      loading_state = 1;
    }, 1000);

    setTimeout(() => {
      loading_state = 2;
    }, 2000);

    setTimeout(() => {
      toggleVisible();
    }, 3000);

    console.log(loadCount);

    if (loadCount <= 0) {
      pageLoadCount.set(1);
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

  p {
    color: white;
    font-weight: bold;
    margin-top: 50px;
    text-align: center;
    font-size: 20px;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
  }
</style>
