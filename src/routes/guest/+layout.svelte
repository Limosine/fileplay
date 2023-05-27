<script lang="ts">
  import TopAppBar from "$lib/components/TopAppBar-guest.svelte";
</script>

<div on:touchmove={(e) => e.preventDefault}>
  <TopAppBar>
    <slot/>
  </TopAppBar>
</div>