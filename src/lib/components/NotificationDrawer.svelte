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
    deleteNotification,
    notification_open,
    notifications,
  } from "$lib/stores/Dialogs";
  import type { INotification } from "$lib/stores/Dialogs";

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
</script>

<svelte:window bind:outerWidth={width} />

<div dir="rtl">
  <Drawer
    class="mdc-top-app-bar--fixed-adjust"
    dir="ltr"
    variant="dismissible"
    bind:open={$notification_open}
  >
    <Header dir="ltr">
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
</div>

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
