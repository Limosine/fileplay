<script lang="ts" context="module">
  import TopAppBar, { Row, Section } from "@smui/top-app-bar";
  import Badge from "@smui-extra/badge";
  import IconButton, { Icon } from "@smui/icon-button";
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import { writable } from "svelte/store";
  import { connectionMode, status as current_status } from "$lib/messages";

  import { drawer_open, drawer as drawer_state } from "$lib/stores/Dialogs";
  import {
    notifications,
    settings_open,
  } from "$lib/stores/Dialogs";

  const open = (open: "Contact" | "Notification" | "Settings") => {
    if (open == "Settings") {
      settings_open.set(true);
    } else {
      drawer_state.set(open);
      drawer_open.update((open) => (open = !open));
    }
  };

  export const topAppBar = writable<TopAppBar>();

  const colors = ["yellow", "green", "red"];
  const status = ["Connecting", "Online", "Error"];
</script>

<header class="mdc-top-app-bar">
  <TopAppBar bind:this={$topAppBar} variant="fixed">
    <Row>
      <Section toolbar>
        <Wrapper>
          <IconButton
            class="material-icons"
            aria-label="Manage contacts"
            on:click={() => open("Contact")}>contacts</IconButton
          >
          <Tooltip>Manage contacts</Tooltip>
        </Wrapper>

        <Wrapper>
          <IconButton
            class="material-icons"
            aria-label="Show notifications"
            on:click={() => open("Notification")}
          >
            <Icon class="material-icons">notifications</Icon>
            {#if $notifications.length != 0}
              <Badge
                aria-label="notification count"
                color="secondary"
                style="margin-top: 7px; margin-right: 3px;"
                >{$notifications.length}</Badge
              >
            {/if}
          </IconButton>

          <Tooltip>Show notifications</Tooltip>
        </Wrapper>
      </Section>

      <Section align="end" toolbar>
        <Wrapper>
          <div>
            <div
              class="connection-status"
              style="background-color: {colors[$current_status]}"
            />
          </div>
          <Tooltip
            >Connection status: {status[$current_status]}{$connectionMode
              ? ` (${$connectionMode})`
              : ""}</Tooltip
          >
        </Wrapper>

        <Wrapper>
          <IconButton
            class="material-icons"
            aria-label="Settings Page"
            on:click={() => open("Settings")}>settings</IconButton
          >
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
