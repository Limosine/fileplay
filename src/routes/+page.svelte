<script lang="ts">
  import { tweened } from "svelte/motion";
  import { elasticInOut } from "svelte/easing";

  // loading state
  let loading_state = 0;
  // pageLoadCount.useLocalStorage();

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

</script>