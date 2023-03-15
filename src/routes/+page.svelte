<script lang="ts">
  import { tweened } from "svelte/motion";
  import { elasticInOut } from "svelte/easing";

  import LinearProgress from "@smui/linear-progress";

  import Viewblock from "./Viewblock.svelte";

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
</script>

<div>
  {#if loading_state < loading_states.length}
    <Viewblock>
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
          }}>hi there</button
        >
      </div>
    </Viewblock>
  {/if}
  <h1>hi</h1>
</div>
