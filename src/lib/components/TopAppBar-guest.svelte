<script lang="ts" context="module">
  import TopAppBar, { Row, Section, Title } from "@smui/top-app-bar";
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import { writable } from "svelte/store";

  export const topAppBar = writable<TopAppBar>();

  const colors = ["green", "yellow", "red"];
  const status = ["Online", "Connecting", "Offline"];
  let current_status = 0;
</script>

<header class="mdc-top-app-bar">
  <TopAppBar bind:this={$topAppBar} variant="fixed">
    <Row>
      <Section>
        <Title>Fileplay</Title>
      </Section>
      <Section align="end" toolbar>
        <Wrapper>
          <div>
            <div
              class="connection-status"
              style="background-color: {colors[current_status]}"
            />
          </div>
          <Tooltip>Connection status: {status[current_status]}</Tooltip>
        </Wrapper>
      </Section>
    </Row>
  </TopAppBar>
</header>

<slot />

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
