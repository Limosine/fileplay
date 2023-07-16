<script lang="ts">
  import "beercss";
  import "material-dynamic-colors";
  import { onMount } from "svelte";

  onMount(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      ui("mode", "dark");
    }
  });
</script>

<slot />