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
  import { onDestroy } from "svelte";

  let notified = false;
  let popNumber = false;

  const open = (open: "Contact" | "Notification" | "Settings") => {
    if (open == "Settings") {
      settings_open.set(true);
    } else {
      if (
        (open == "Contact" && $drawer_state == "Contact") ||
        (open == "Notification" && $drawer_state == "Notification")
      ) {
        drawer_open.update((open) => (open = !open));
      } else if ($drawer_state == "") {
        drawer_state.set(open);
        drawer_open.set(true);
      } else {
        drawer_open.set(false);
        setTimeout(() => {
          drawer_state.set(open);
          drawer_open.set(true);
        }, 300);
      }
    }
  };

  $: $notifications, notifyIcon();

  const notifyIcon = () => {
    console.log("Notified");
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

  const test = setInterval(() => {
    $notifications = [
      ...$notifications,
      {
        tag: "tag",
        title: "Title",
        actions: [
          { action: "Accept", title: "Accept" },
          { action: "Reject", title: "Reject" },
        ],
        body: "Nimm an",
        data: "",
      },
    ];
    console.log("Added not: ", $notifications);
  }, 2000);

  onDestroy(() => {
    clearInterval(test);
  });

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
            class="material-icons notify"
            aria-label="Show notifications"
            on:click={() => open("Notification")}
          >
            <Icon class="material-icons {notified ? 'notify' : ''}"
              >notifications</Icon
            >
            {#if $notifications.length != 0}
              <Badge
                class={popNumber ? "pop-number badge-margin" : "badge-margin"}
                aria-label="notification count"
                color="secondary">{$notifications.length}</Badge
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

  :global(.notify) {
    animation: acceptNotification 0.45s linear;
  }

  :global(.pop-number) {
    animation: pop 0.3s ease-in-out;
    transform-origin: top right;
  }

  :global(.badge-margin) {
    margin-top: 7px;
    margin-right: 3px;
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
      transform: scale(0);
    }
    85% {
      transform: scale(1.3);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
