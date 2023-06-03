<script lang="ts" context="module">
  import TopAppBar, {
    Row,
    Section,
    Title,
  } from "@smui/top-app-bar";
  import Badge from '@smui-extra/badge';
  import IconButton, { Icon } from "@smui/icon-button";
  import Tooltip, { Wrapper } from '@smui/tooltip';
  import { writable } from 'svelte/store';
  import { goto } from '$app/navigation';

  import { open as drawer_open } from './ContactDrawer.svelte';
  import { notifications, notification_open } from '$lib/stores/Dialogs';

  const open = (drawer: string) => {
    if (drawer == "contact") {
      notification_open.set(false);
      drawer_open.update(open => (open = !open));
    } else {
      drawer_open.set(false);
      notification_open.update(open => (open = !open));
    }
  }

  export const topAppBar = writable<TopAppBar>();

  const colors = ["green", "yellow", "red"];
  const status = ["Online", "Connecting", "Offline"];
  let current_status = 0;
</script>

<header class="mdc-top-app-bar">
  <TopAppBar bind:this={$topAppBar} variant="fixed">
    <Row>
      <Section align="end" toolbar>
        <Wrapper>
          <div><div class="connection-status" style="background-color: {colors[current_status]}"></div></div>
          <Tooltip>Connection status: {status[current_status]}</Tooltip>
        </Wrapper>

        <Wrapper>
          <IconButton class="material-icons" aria-label="Show notifications" on:click={() => open("notification")}>
            <Icon class="material-icons">notifications</Icon>
            {#if $notifications.length != 0}
              <Badge aria-label="notification count" color="secondary">{$notifications.length}</Badge>
            {/if}
          </IconButton>

          <Tooltip>Show notifications</Tooltip>
        </Wrapper>

        <Wrapper>
          <IconButton class="material-icons" aria-label="Manage contacts" on:click={() => open("contact")}
            >contacts</IconButton>
          <Tooltip>Manage contacts</Tooltip>
        </Wrapper>

        <Wrapper>
          <IconButton class="material-icons" aria-label="Settings Page" on:click={() => goto("/settings")}
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
