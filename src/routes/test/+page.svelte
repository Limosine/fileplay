<script lang="ts">
  import { addChunks, getFile } from "$lib/lib/chunking";
  import "beercss";
  import { onMount } from "svelte";

  onMount(async () => {
    const t = await addChunks(new Uint8Array(5));
    console.log(t);
    console.log(getFile(t));
  });
</script>