<script lang="ts">
  import Drawer, { Content, Header, Title } from "@smui/drawer";

  import IconButton from "@smui/icon-button";
  import Card, {
    ActionButtons,
    ActionIcons,
    Actions,
    Content as C_Content,
  } from "@smui/card";
  import Button, { Label } from "@smui/button";
  import {
    addNotification,
    deleteNotification,
    notification_open,
    notifications,
  } from "$lib/stores/Dialogs";
  import type { INotification } from "$lib/stores/Dialogs";
  import { onMount } from "svelte";
  import { SHARING_TIMEOUT } from "$lib/common";

  let width: number;

  async function handleNotificationClick(n: INotification, action: string) {
    deleteNotification(n.tag);
    if (action == "close") return null;
    const messages = (await import("$lib/messages")).default_messages;
    messages.dispatchNotificationClick({
      type: action,
      data: n.data,
    });
  }

  onMount(async () => {
    const messages = (await import("$lib/messages")).default_messages;
    messages.onmessage("sharing_request", (data) => {
      console.log("sharing_request", data);
      addNotification({
        title: "Sharing Request",
        body: `${data.sender} wants to share files with you. Click to accept.`,
        actions: [
          {
            title: "Accept",
            action: "share_accept",
          },
          {
            title: "Reject",
            action: "share_reject",
          },
        ],
        tag: data.sid,
        data: data,
      });
      setTimeout(() => {
        deleteNotification(data.sid);
      }, SHARING_TIMEOUT);
    });
    messages.onmessage("sharing_cancel", (data) => {
      console.log("sharing_cancel", data);
      deleteNotification(data.sid);
    });
  });
</script>

<svelte:window bind:outerWidth={width} />

<Drawer
  class="mdc-top-app-bar--fixed-adjust"
  variant="dismissible"
  bind:open={$notification_open}
>
  <Header>
    <Title>Notifications</Title>
  </Header>
  <Content>
    <div class="list-box">
      {#each $notifications as n}
        <Card>
          <C_Content class="mdc-typography--body2">
            <h6>{n.title}</h6>
            {n.body}
          </C_Content>
          <Actions>
            {#each n.actions ?? [] as action}
              <ActionButtons>
                <Button
                  on:click={() => handleNotificationClick(n, action.action)}
                >
                  <Label>{action.title}</Label>
                </Button>
              </ActionButtons>
            {/each}
            <ActionIcons>
              <IconButton
                class="material-icons"
                on:click={() => deleteNotification(n.tag)}
              >
                close
              </IconButton>
            </ActionIcons>
          </Actions>
        </Card>
      {/each}
    </div>
  </Content>
</Drawer>

<slot />

<style>
  * :global(.app-content) {
    padding: 16px;
  }
  .list-box {
    display: flex;
    flex-flow: column;
    gap: 10px;
    padding: 7px;
  }
</style>
