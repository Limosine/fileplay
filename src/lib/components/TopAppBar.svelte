<script lang="ts" context="module">
  import TopAppBar, {
    Row,
    Section,
    Title,
  } from "@smui/top-app-bar";
  import IconButton from "@smui/icon-button";
  import Tooltip, { Wrapper } from "@smui/tooltip";

  import { writable } from "svelte/store";

  export const topAppBar2 = writable();


</script>

<header class="mdc-top-app-bar">
  <TopAppBar bind:this={$topAppBar} variant="fixed">
    <Row>
      <Section>
        <IconButton class="material-icons" on:click={() => drawer_open.update(open => (open = !open))}
          >menu</IconButton
        >
        <Title>Fileplay</Title>
      </Section>
      <Section align="end" toolbar>
        <Wrapper>
          <div><div class="connection-status" style="background-color: {colors[current_status]}"></div></div>
          <Tooltip>Connection status: {status[current_status]}</Tooltip>
        </Wrapper>


<style>

</style>
