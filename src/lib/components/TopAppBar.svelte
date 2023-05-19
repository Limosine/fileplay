<script lang="ts" context="module">
  import TopAppBar, {
    Row,
    Section,
    Title,
  } from "@smui/top-app-bar";
  import IconButton from "@smui/icon-button";
  import Tooltip, { Wrapper } from '@smui/tooltip';
  import { writable } from 'svelte/store';

  import { open as drawer_open } from './Drawer.svelte';

  export const topAppBar = writable<TopAppBar>();

  const colors = ["green", "yellow", "red"];
  const status = ["Online", "Connecting", "Offline"];
  let current_status = 0;
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

        <Wrapper>
          <IconButton class="material-icons" aria-label="Show notifications"
            >notifications</IconButton>
          <Tooltip>Show notifications</Tooltip>
        </Wrapper>

        <Wrapper>
          <IconButton class="material-icons" aria-label="Account page"
            >account_circle</IconButton>
          <Tooltip>Account page</Tooltip>
        </Wrapper>

        <Wrapper>
          <IconButton class="material-icons" aria-label="Settings Page"
            >settings</IconButton>
          <Tooltip>Settings Page</Tooltip>
        </Wrapper>
      </Section>
    </Row>
  </TopAppBar>
</header>

<style>
  .mdc-top-app-bar {
    z-index: 7;
  }
  .connection-status {
    margin: 14px;
    border-radius: 50%;
    border: 4px solid white;
    height: 12px;
    width: 12px;
  }
</style>