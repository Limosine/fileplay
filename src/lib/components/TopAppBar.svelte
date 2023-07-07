<script lang="ts">
  import TopAppBar, { Row, Section } from "@smui/top-app-bar";
  import Badge from "@smui-extra/badge";
  import IconButton, { Icon } from "@smui/icon-button";
  import Tooltip, { Wrapper } from "@smui/tooltip";
  import { connectionMode, status as current_status } from "$lib/messages";

  import {
    drawer_open,
    drawer as drawer_state,
    topAppBar,
  } from "$lib/stores/Dialogs";
  import { notifications, settings_open } from "$lib/stores/Dialogs";

  let cachedLength = 0;
  let notified = false;
  let popNumber = false;

  const open = (open: "Contact" | "Notification" | "Settings") => {
    if (open == "Settings") {
      settings_open.set(true);
    } else {
      if (!$drawer_open) {
        drawer_state.set(open);
        drawer_open.set(true);
      } else {
        if (
          (open == "Contact" && $drawer_state == "Notification") ||
          (open == "Notification" && $drawer_state == "Contact")
        ) {
          drawer_open.set(false);
          setTimeout(() => {
            drawer_state.set(open);
            drawer_open.set(true);
          }, 300);
        } else {
          drawer_open.set(false);
        }
      }
    }
  };

  $: $notifications, notifyIcon();

  const notifyIcon = () => {
    if (cachedLength < $notifications.length) {
      cachedLength = $notifications.length;
    } else {
      cachedLength = $notifications.length;
      return;
    }

    console.log("Notified: ", $notifications, notified);
    if (!notified) {
      notified = true;
      setTimeout(() => {
        notified = false;
      }, 450);
    }
    if (!popNumber) {
      popNumber = true;
      setTimeout(() => {
        popNumber = false;
      }, 300);
    }
  };

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
            <Icon class="material-icons {notified ? 'notify' : ''}"
              >notifications</Icon
            >
            {#if $notifications.length != 0}
              <div class={popNumber ? "pop-number" : ""}>
                <Badge
                  aria-label="notification count"
                  style="margin-top: 7px;
                  margin-right: 3px;"
                  color="secondary">{$notifications.length}</Badge
                >
              </div>
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

  :global(.notify) {
    animation: acceptNotification 0.45s linear;
  }

  :global(.pop-number) {
    animation: pop 0.3s ease-in-out;
  }

  @keyframes acceptNotification {
    0% {
      transform: rotate(0deg);
    }
    20% {
      transform: rotate(40deg);
    }
    60% {
      transform: rotate(-40deg);
    }
    85% {
      transform: rotate(15deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @keyframes pop {
    0% {
      transform: scale(0) translateX(10px) translateY(-33px);
    }
    85% {
      transform: scale(1.3) translateX(10px) translateY(-33px);
    }
    100% {
      transform: scale(1) translateX(10px) translateY(-33px);
    }
  }
</style>
